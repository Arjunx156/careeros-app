import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiSuccess, apiValidationError, handleRoute } from "@/lib/api/response";
import { prisma } from "@/lib/db/prisma";
import { getOwnerId } from "@/lib/db/user";
import { RELATIONSHIP_STATUSES } from "@/lib/contacts/status";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value.length === 0 ? null : value))
    .nullable()
    .optional();

const optionalDate = z
  .string()
  .trim()
  .transform((value) => (value.length === 0 ? null : new Date(value)))
  .nullable()
  .optional()
  .refine(
    (value) => value === null || value === undefined || !Number.isNaN(value.getTime()),
    "That date is not valid.",
  );

export const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
  company: optionalText(120),
  position: optionalText(160),
  linkedinUrl: optionalText(400),
  email: optionalText(160),
  location: optionalText(120),
  relationshipStatus: z.enum(RELATIONSHIP_STATUSES).default("not_contacted"),
  howMet: optionalText(200),
  targetCompany: optionalText(120),
  targetRole: optionalText(160),
  referralStatus: z.enum(["none", "requested", "received"]).nullable().optional(),
  nextFollowupDate: optionalDate,
  notes: optionalText(10_000),
});

export async function GET() {
  return handleRoute(async () => {
    const userId = await getOwnerId();

    const contacts = await prisma.contact.findMany({
      where: { userId },
      orderBy: [{ nextFollowupDate: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        company: true,
        position: true,
        relationshipStatus: true,
        linkedinUrl: true,
        lastContactedAt: true,
        nextFollowupDate: true,
        _count: { select: { messages: true } },
      },
    });

    return apiSuccess(contacts);
  });
}

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const userId = await getOwnerId();

    const parsed = contactSchema.safeParse(await request.json());
    if (!parsed.success) return apiValidationError(parsed.error);

    const { nextFollowupDate, ...data } = parsed.data;

    const contact = await prisma.$transaction(async (tx) => {
      const created = await tx.contact.create({
        data: { userId, ...data, nextFollowupDate: nextFollowupDate ?? null },
        select: { id: true, name: true },
      });

      // Same rule as applications: a follow-up date only helps if something
      // surfaces it, so the reminder is created alongside.
      if (nextFollowupDate) {
        await tx.followUp.create({
          data: {
            userId,
            type: "contact",
            contactId: created.id,
            dueDate: nextFollowupDate,
            note: `Follow up with ${created.name}`,
          },
        });
      }

      return created;
    });

    return apiSuccess(contact, 201);
  });
}
