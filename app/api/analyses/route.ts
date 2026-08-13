import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess, apiValidationError, handleRoute } from "@/lib/api/response";
import { isAiConfigured } from "@/lib/ai/gemini";
import { prisma } from "@/lib/db/prisma";
import { getOwnerId } from "@/lib/db/user";

const createSchema = z.object({
  resumeVersionId: z.string().min(1, "Select a resume."),
  jdText: z.string().trim().min(100, "Paste the full job description (at least 100 characters)."),
  company: z.string().trim().max(200).optional(),
  role: z.string().trim().max(200).optional(),
  jobUrl: z.string().trim().max(500).optional(),
});

export async function GET() {
  return handleRoute(async () => {
    const userId = await getOwnerId();

    const analyses = await prisma.analysis.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        stage: true,
        overallScore: true,
        atsScore: true,
        recruiterVerdict: true,
        createdAt: true,
        resumeVersion: { select: { id: true, name: true } },
        jobDescription: { select: { id: true, company: true, role: true } },
      },
    });

    return apiSuccess(analyses);
  });
}

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    if (!isAiConfigured()) {
      return apiError(
        "No Gemini API key configured. Add GOOGLE_GENERATIVE_AI_API_KEY to .env.local.",
        503,
      );
    }

    const userId = await getOwnerId();

    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) return apiValidationError(parsed.error);

    const { resumeVersionId, jdText, company, role, jobUrl } = parsed.data;

    const resume = await prisma.resumeVersion.findFirst({
      where: { id: resumeVersionId, userId },
      select: { id: true, extractedText: true },
    });
    if (!resume) return apiError("Resume not found.", 404);

    if (!resume.extractedText || resume.extractedText.trim().length < 100) {
      return apiError(
        "That resume has no extractable text, so it cannot be analyzed. Re-upload a text-based PDF.",
        422,
      );
    }

    // The JD row is created up front so the analysis has something to hang off
    // even if every AI stage fails — the user's pasted text is never lost.
    const analysis = await prisma.$transaction(async (tx) => {
      const jobDescription = await tx.jobDescription.create({
        data: {
          userId,
          company: company?.trim() || "Unknown company",
          role: role?.trim() || "Unknown role",
          jobUrl: jobUrl?.trim() || null,
          jdText,
        },
        select: { id: true },
      });

      return tx.analysis.create({
        data: {
          userId,
          resumeVersionId: resume.id,
          jobDescriptionId: jobDescription.id,
          status: "pending",
          stage: 0,
        },
        select: { id: true, stage: true, status: true },
      });
    });

    return apiSuccess(analysis, 201);
  });
}
