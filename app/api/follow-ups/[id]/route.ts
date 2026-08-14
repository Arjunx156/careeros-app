import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess, apiValidationError, handleRoute } from "@/lib/api/response";
import { prisma } from "@/lib/db/prisma";
import { getOwnerId } from "@/lib/db/user";

/** Snooze length, per docs/03_App_Flow.md. */
const SNOOZE_DAYS = 3;

const bodySchema = z.object({
  action: z.enum(["done", "snooze", "reschedule"]),
  /** Required for reschedule. */
  dueDate: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  context: RouteContext<"/api/follow-ups/[id]">,
) {
  return handleRoute(async () => {
    const { id } = await context.params;
    const userId = await getOwnerId();

    const existing = await prisma.followUp.findFirst({
      where: { id, userId },
      select: { id: true, dueDate: true, applicationId: true },
    });
    if (!existing) return apiError("Follow-up not found.", 404);

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) return apiValidationError(parsed.error);

    const { action, dueDate } = parsed.data;

    if (action === "done") {
      const [updated] = await prisma.$transaction([
        prisma.followUp.update({
          where: { id },
          data: { status: "done", completedAt: new Date() },
          select: { id: true, status: true },
        }),
        // Clear the date on the parent row too, or the application still looks
        // like it has an outstanding follow-up.
        ...(existing.applicationId
          ? [
              prisma.application.update({
                where: { id: existing.applicationId },
                data: { nextFollowupDate: null },
              }),
            ]
          : []),
      ]);

      return apiSuccess(updated);
    }

    if (action === "snooze") {
      // Snooze from today, not from the original date — snoozing something a
      // week overdue should push it forward, not leave it in the past.
      const next = new Date();
      next.setDate(next.getDate() + SNOOZE_DAYS);
      next.setHours(9, 0, 0, 0);

      const updated = await prisma.followUp.update({
        where: { id },
        data: { status: "pending", dueDate: next, snoozedUntil: next },
        select: { id: true, dueDate: true },
      });

      return apiSuccess(updated);
    }

    if (!dueDate) return apiError("Pick a new date.", 400);

    const parsedDate = new Date(dueDate);
    if (Number.isNaN(parsedDate.getTime())) {
      return apiError("That date is not valid.", 400);
    }

    const updated = await prisma.followUp.update({
      where: { id },
      data: { status: "pending", dueDate: parsedDate },
      select: { id: true, dueDate: true },
    });

    return apiSuccess(updated);
  });
}
