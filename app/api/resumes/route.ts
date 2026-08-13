import type { NextRequest } from "next/server";
import { apiError, apiSuccess, apiValidationError, handleRoute } from "@/lib/api/response";
import { prisma } from "@/lib/db/prisma";
import { getOwnerId } from "@/lib/db/user";
import { extractPdfText } from "@/lib/resume/extract";
import { createResumeSchema, validateResumeFile } from "@/lib/resume/schema";
import { getStorage, resumePath } from "@/lib/storage";

// Parsing a PDF is CPU-bound and can take a few seconds on a large file.
export const maxDuration = 60;

export async function GET() {
  return handleRoute(async () => {
    const userId = await getOwnerId();

    const resumes = await prisma.resumeVersion.findMany({
      where: { userId },
      orderBy: [{ isMaster: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        targetRole: true,
        targetIndustry: true,
        isMaster: true,
        versionNumber: true,
        fileUrl: true,
        fileSizeBytes: true,
        skills: true,
        createdAt: true,
        // Deliberately omits extractedText — it is large and the list never
        // shows it. Loading it here would balloon every page load.
        _count: { select: { analyses: true, applications: true } },
      },
    });

    return apiSuccess(resumes);
  });
}

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const userId = await getOwnerId();
    const formData = await request.formData();

    const file = formData.get("file");
    if (!(file instanceof File)) {
      return apiError("Choose a PDF to upload.");
    }

    const fileError = validateResumeFile(file);
    if (fileError) return apiError(fileError);

    const parsed = createResumeSchema.safeParse({
      name: formData.get("name") ?? "",
      targetRole: formData.get("targetRole") ?? "",
      targetIndustry: formData.get("targetIndustry") ?? "",
      isMaster: formData.get("isMaster") === "true",
    });
    if (!parsed.success) return apiValidationError(parsed.error);

    const buffer = Buffer.from(await file.arrayBuffer());

    // Extract before storing: a scanned PDF is rejected outright, so there is
    // no point uploading bytes we are about to orphan.
    const extraction = await extractPdfText(buffer);
    if (!extraction.ok) {
      return apiError(extraction.message, 422);
    }

    const { name, targetRole, targetIndustry, isMaster } = parsed.data;

    // Version numbers count same-named lineages, so "Business Analyst" uploaded
    // three times reads as v1/v2/v3 rather than three unrelated files.
    const priorVersions = await prisma.resumeVersion.count({
      where: { userId, name },
    });

    const storage = getStorage();
    const id = crypto.randomUUID();
    const stored = await storage.put(
      resumePath(userId, id),
      buffer,
      "application/pdf",
    );

    try {
      const resume = await prisma.$transaction(async (tx) => {
        // Exactly one master at a time.
        if (isMaster) {
          await tx.resumeVersion.updateMany({
            where: { userId, isMaster: true },
            data: { isMaster: false },
          });
        }

        // The very first upload becomes master automatically — otherwise the
        // analyzer has no sensible default to preselect.
        const isFirstResume = (await tx.resumeVersion.count({ where: { userId } })) === 0;

        return tx.resumeVersion.create({
          data: {
            userId,
            name,
            targetRole: targetRole ?? null,
            targetIndustry: targetIndustry ?? null,
            isMaster: isMaster || isFirstResume,
            versionNumber: priorVersions + 1,
            fileUrl: stored.url,
            filePathname: stored.pathname,
            fileSizeBytes: stored.size,
            extractedText: extraction.text,
          },
          select: { id: true, name: true, isMaster: true, versionNumber: true },
        });
      });

      return apiSuccess(resume, 201);
    } catch (error) {
      // Never leave a file behind with no database row pointing at it.
      await storage.delete(stored.pathname).catch(() => {});
      throw error;
    }
  });
}
