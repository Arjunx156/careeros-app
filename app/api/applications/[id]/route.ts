import type { NextRequest } from "next/server";
import { apiError, apiSuccess, apiValidationError, handleRoute } from "@/lib/api/response";
import { prisma } from "@/lib/db/prisma";
import { getOwnerId } from "@/lib/db/user";
import { updateApplicationSchema } from "@/lib/applications/schema";
import { statusDirection, statusLabel } from "@/lib/applications/status";

export async function GET(
  _request: NextRequest,
  context: RouteContext<"/api/applications/[id]">,
) {
  return handleRoute(async () => {
    const { id } = await context.params;
    const userId = await getOwnerId();

    const application = await prisma.application.findFirst({
      where: { id, userId },
      include: {
        resumeVersion: { select: { id: true, name: true } },
        analysis: { select: { id: true, overallScore: true, status: true } },
        jobDescription: { select: { id: true, company: true, role: true } },
        contact: { select: { id: true, name: true } },
        interviews: { orderBy: { scheduledAt: "asc" } },
        messages: { orderBy: { createdAt: "desc" } },
        followUps: { orderBy: { dueDate: "asc" } },
        timelineEvents: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!application) return apiError("Application not found.", 404);
    return apiSuccess(application);
  });
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext<"/api/applications/[id]">,
) {
  return handleRoute(async () => {
    const { id } = await context.params;
    const userId = await getOwnerId();

    const existing = await prisma.application.findFirst({
      where: { id, userId },
      select: { id: true, status: true, company: true, nextFollowupDate: true },
    });
    if (!existing) return apiError("Application not found.", 404);

    const parsed = updateApplicationSchema.safeParse(await request.json());
    if (!parsed.success) return apiValidationError(parsed.error);

    const { nextFollowupDate, ...data } = parsed.data;
    const isStatusChange = data.status !== undefined && data.status !== existing.status;

    const updated = await prisma.$transaction(async (tx) => {
      const application = await tx.application.update({
        where: { id },
        data: {
          ...data,
          ...(nextFollowupDate !== undefined ? { nextFollowupDate } : {}),
        },
        select: { id: true, company: true, role: true, status: true },
      });

      // The timeline is the audit trail — every status change is recorded with
      // both old and new value, so the history is reconstructable.
      if (isStatusChange && data.status) {
        const direction = statusDirection(existing.status, data.status);
        await tx.timelineEvent.create({
          data: {
            userId,
            applicationId: id,
            eventType: "status_change",
            description:
              direction === "backward"
                ? `Moved back to ${statusLabel(data.status)}`
                : `Moved to ${statusLabel(data.status)}`,
            oldValue: existing.status,
            newValue: data.status,
          },
        });
      }

      // Keep the reminder list in step with the date on the row: a new date
      // creates or reschedules, clearing it cancels the pending reminder.
      if (nextFollowupDate !== undefined) {
        await tx.followUp.updateMany({
          where: { applicationId: id, status: "pending" },
          data: { status: "rescheduled" },
        });

        if (nextFollowupDate) {
          await tx.followUp.create({
            data: {
              userId,
              type: "application",
              applicationId: id,
              dueDate: nextFollowupDate,
              note: `Follow up with ${existing.company}`,
            },
          });
        }
      }

      return application;
    });

    return apiSuccess(updated);
  });
}

export async function DELETE(
  _request: NextRequest,
  context: RouteContext<"/api/applications/[id]">,
) {
  return handleRoute(async () => {
    const { id } = await context.params;
    const userId = await getOwnerId();

    const existing = await prisma.application.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!existing) return apiError("Application not found.", 404);

    // Interviews, messages, timeline events and follow-ups cascade via the schema.
    await prisma.application.delete({ where: { id } });
    return apiSuccess({ id });
  });
}
