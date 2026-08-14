import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess, apiValidationError, handleRoute } from "@/lib/api/response";
import { describeStageError } from "@/lib/api/errors";
import { prisma } from "@/lib/db/prisma";
import { getOwnerId } from "@/lib/db/user";
import { parseResumeFacts } from "@/lib/analysis/facts";
import { findBannedPhrases, generateMessage } from "@/lib/messages/generate";
import { MESSAGE_TYPES } from "@/lib/contacts/status";
import type { Prisma } from "@/lib/generated/prisma/client";

export const maxDuration = 60;

const generateSchema = z.object({
  contactId: z.string().min(1),
  type: z.enum(MESSAGE_TYPES.map((item) => item.value) as [string, ...string[]]),
  extraContext: z.string().max(4000).optional(),
});

const saveSchema = z.object({
  contactId: z.string().min(1),
  type: z.enum(MESSAGE_TYPES.map((item) => item.value) as [string, ...string[]]),
  content: z.string().min(1).max(10_000),
  markSent: z.boolean().default(false),
});

/** POST — generate a draft. Nothing is persisted until the user saves it. */
export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const userId = await getOwnerId();

    const parsed = generateSchema.safeParse(await request.json());
    if (!parsed.success) return apiValidationError(parsed.error);

    const contact = await prisma.contact.findFirst({
      where: { id: parsed.data.contactId, userId },
      select: {
        name: true,
        company: true,
        position: true,
        howMet: true,
        targetRole: true,
        relationshipStatus: true,
      },
    });
    if (!contact) return apiError("Contact not found.", 404);

    // Candidate facts come from the master resume, so the message can only
    // claim things the resume actually says.
    const resume = await prisma.resumeVersion.findFirst({
      where: { userId },
      orderBy: [{ isMaster: "desc" }, { createdAt: "desc" }],
      select: { extractedText: true, targetRole: true },
    });

    const facts = resume?.extractedText
      ? parseResumeFacts(resume.extractedText)
      : null;

    try {
      const generated = await generateMessage({
        type: parsed.data.type as never,
        contact,
        targetRole: contact.targetRole ?? resume?.targetRole ?? null,
        extraContext: parsed.data.extraContext ?? null,
        candidate: {
          name: null,
          headline: facts?.summaryText ?? null,
          topSkills: facts?.declaredSkills.slice(0, 10) ?? [],
          evidence: facts?.bullets.slice(0, 8).map((bullet) => bullet.text) ?? [],
        },
      });

      // The prompt bans these openers; this checks whether it listened.
      const banned = findBannedPhrases(generated.message);

      return apiSuccess({ ...generated, bannedPhrases: banned });
    } catch (error) {
      console.error("[messages] generation failed:", error);
      return apiError(describeStageError(error), 502);
    }
  });
}

/** PUT — save a message the user is happy with, and advance the relationship. */
export async function PUT(request: NextRequest) {
  return handleRoute(async () => {
    const userId = await getOwnerId();

    const parsed = saveSchema.safeParse(await request.json());
    if (!parsed.success) return apiValidationError(parsed.error);

    const contact = await prisma.contact.findFirst({
      where: { id: parsed.data.contactId, userId },
      select: { id: true, relationshipStatus: true },
    });
    if (!contact) return apiError("Contact not found.", 404);

    const message = await prisma.$transaction(async (tx) => {
      const created = await tx.message.create({
        data: {
          userId,
          contactId: contact.id,
          type: parsed.data.type as never,
          platform: "LinkedIn",
          content: parsed.data.content,
          status: parsed.data.markSent ? "sent" : "draft",
          sentAt: parsed.data.markSent ? new Date() : null,
          aiGenerated: true,
        },
        select: { id: true, status: true },
      });

      // Sending a message moves the relationship forward — but never backward,
      // so logging a note against an already-replied contact does not demote it.
      if (parsed.data.markSent && contact.relationshipStatus === "connected") {
        await tx.contact.update({
          where: { id: contact.id },
          data: { relationshipStatus: "message_sent", lastContactedAt: new Date() },
        });
      } else if (parsed.data.markSent) {
        await tx.contact.update({
          where: { id: contact.id },
          data: { lastContactedAt: new Date() },
        });
      }

      return created;
    });

    return apiSuccess(message, 201);
  });
}

export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    const userId = await getOwnerId();
    const contactId = request.nextUrl.searchParams.get("contactId");

    const where: Prisma.MessageWhereInput = {
      userId,
      ...(contactId ? { contactId } : {}),
    };

    const messages = await prisma.message.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        type: true,
        content: true,
        status: true,
        sentAt: true,
        createdAt: true,
        contact: { select: { id: true, name: true } },
      },
    });

    return apiSuccess(messages);
  });
}
