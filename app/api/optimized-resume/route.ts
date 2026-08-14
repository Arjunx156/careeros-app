import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess, apiValidationError, handleRoute } from "@/lib/api/response";
import { describeStageError } from "@/lib/api/errors";
import { prisma } from "@/lib/db/prisma";
import { getOwnerId } from "@/lib/db/user";
import { parseResumeFacts } from "@/lib/analysis/facts";
import { generateOptimizedResume } from "@/lib/resume/generate";
import { renderResumePdf } from "@/lib/resume/render-pdf";
import { renderResumeDocx } from "@/lib/resume/render-docx";
import { getStorage } from "@/lib/storage";
import type { Prisma } from "@/lib/generated/prisma/client";

// Generation plus two document renders.
export const maxDuration = 120;

const bodySchema = z.object({
  analysisId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const userId = await getOwnerId();

    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return apiValidationError(parsed.error);

    const analysis = await prisma.analysis.findFirst({
      where: { id: parsed.data.analysisId, userId },
      include: {
        resumeVersion: { select: { id: true, name: true, extractedText: true } },
        jobDescription: { select: { company: true, role: true } },
      },
    });
    if (!analysis) return apiError("Analysis not found.", 404);

    if (analysis.status !== "complete") {
      return apiError(
        "Finish the analysis first — the optimizer works from its findings.",
        409,
      );
    }

    const sourceText = analysis.resumeVersion.extractedText ?? "";
    if (sourceText.trim().length === 0) {
      return apiError("The source resume has no extractable text.", 422);
    }

    const facts = parseResumeFacts(sourceText);

    const mustHave = ((analysis.mustHaveRequirements ?? []) as Array<{
      requirement?: string;
    }>)
      .map((item) => item.requirement ?? "")
      .filter(Boolean);

    let generated;
    try {
      generated = await generateOptimizedResume({
        facts,
        sourceText,
        targetRole: analysis.jobDescription.role,
        targetCompany: analysis.jobDescription.company,
        mustHave,
        missingKeywords: analysis.keywordsMissing,
        recommendedSummary: analysis.recommendedSummary,
      });
    } catch (error) {
      console.error("[optimized-resume] generation failed:", error);
      return apiError(describeStageError(error), 502);
    }

    const { resume, removed } = generated;

    if (resume.experience.length === 0) {
      return apiError(
        "Nothing in the generated resume could be traced back to your source. Try again.",
        502,
      );
    }

    const storage = getStorage();
    const id = crypto.randomUUID();
    const baseName = `${analysis.jobDescription.company} ${analysis.jobDescription.role}`
      .replace(/[^a-z0-9 -]/gi, "")
      .trim();

    const [pdfBuffer, docxBuffer] = await Promise.all([
      renderResumePdf(resume),
      renderResumeDocx(resume),
    ]);

    const [pdf, docx] = await Promise.all([
      storage.put(`${userId}/optimized/${id}.pdf`, pdfBuffer, "application/pdf"),
      storage.put(
        `${userId}/optimized/${id}.docx`,
        docxBuffer,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ),
    ]);

    const record = await prisma.optimizedResume.create({
      data: {
        userId,
        analysisId: analysis.id,
        resumeVersionId: analysis.resumeVersion.id,
        name: `${baseName || analysis.resumeVersion.name} — Optimized`,
        content: {
          resume,
          // Kept so the UI can tell the user exactly what was removed and why.
          removedFacts: removed,
        } as unknown as Prisma.InputJsonValue,
        pdfUrl: pdf.url,
        pdfPathname: pdf.pathname,
        docxUrl: docx.url,
        docxPathname: docx.pathname,
      },
      select: { id: true, name: true, pdfUrl: true, docxUrl: true },
    });

    return apiSuccess({ ...record, removedCount: removed.length }, 201);
  });
}

export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    const userId = await getOwnerId();
    const analysisId = request.nextUrl.searchParams.get("analysisId");

    const records = await prisma.optimizedResume.findMany({
      where: { userId, ...(analysisId ? { analysisId } : {}) },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        pdfUrl: true,
        docxUrl: true,
        createdAt: true,
        analysisId: true,
      },
    });

    return apiSuccess(records);
  });
}
