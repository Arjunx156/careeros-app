import type { NextRequest } from "next/server";
import { apiError, apiSuccess, apiValidationError, handleRoute } from "@/lib/api/response";
import { prisma } from "@/lib/db/prisma";
import { getOwnerId } from "@/lib/db/user";
import { contactSchema } from "@/app/api/contacts/route";

export async function GET(
  _request: NextRequest,
  context: RouteContext<"/api/contacts/[id]">,
) {
  return handleRoute(async () => {
    const { id } = await context.params;
    const userId = await getOwnerId();

    const contact = await prisma.contact.findFirst({
      where: { id, userId },
      include: {
        messages: { orderBy: { createdAt: "desc" } },
        followUps: { orderBy: { dueDate: "asc" } },
        applications: { select: { id: true, company: true, role: true, status: true } },
      },
    });

    if (!contact) return apiError("Contact not found.", 404);
    return apiSuccess(contact);
  });
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext<"/api/contacts/[id]">,
) {
  return handleRoute(async () => {
    const { id } = await context.params;
    const userId = await getOwnerId();

    const existing = await prisma.contact.findFirst({
      where: { id, userId },
      select: { id: true, name: true },
    });
    if (!existing) return apiError("Contact not found.", 404);

    const parsed = contactSchema.partial().safeParse(await request.json());
    if (!parsed.success) return apiValidationError(parsed.error);

    const { nextFollowupDate, ...data } = parsed.data;

    const contact = await prisma.$transaction(async (tx) => {
      const updated = await tx.contact.update({
        where: { id },
        data: {
          ...data,
          ...(nextFollowupDate !== undefined ? { nextFollowupDate } : {}),
        },
        select: { id: true, name: true, relationshipStatus: true },
      });

      if (nextFollowupDate !== undefined) {
        await tx.followUp.updateMany({
          where: { contactId: id, status: "pending" },
          data: { status: "rescheduled" },
        });

        if (nextFollowupDate) {
          await tx.followUp.create({
            data: {
              userId,
              type: "contact",
              contactId: id,
              dueDate: nextFollowupDate,
              note: `Follow up with ${existing.name}`,
            },
          });
        }
      }

      return updated;
    });

    return apiSuccess(contact);
  });
}

export async function DELETE(
  _request: NextRequest,
  context: RouteContext<"/api/contacts/[id]">,
) {
  return handleRoute(async () => {
    const { id } = await context.params;
    const userId = await getOwnerId();

    const existing = await prisma.contact.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!existing) return apiError("Contact not found.", 404);

    await prisma.contact.delete({ where: { id } });
    return apiSuccess({ id });
  });
}
