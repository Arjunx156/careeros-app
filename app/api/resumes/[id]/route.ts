import type { NextRequest } from "next/server";
import { apiError, apiSuccess, apiValidationError, handleRoute } from "@/lib/api/response";
import { prisma } from "@/lib/db/prisma";
import { getOwnerId } from "@/lib/db/user";
import { updateResumeSchema } from "@/lib/resume/schema";
import { getStorage } from "@/lib/storage";

export async function GET(
  _request: NextRequest,
  context: RouteContext<"/api/resumes/[id]">,
) {
  return handleRoute(async () => {
    const { id } = await context.params;
    const userId = await getOwnerId();

    const resume = await prisma.resumeVersion.findFirst({
      where: { id, userId },
    });

    // 404 rather than 403 — never confirm a record exists to someone who
    // does not own it.
    if (!resume) return apiError("Resume not found.", 404);

    return apiSuccess(resume);
  });
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext<"/api/resumes/[id]">,
) {
  return handleRoute(async () => {
    const { id } = await context.params;
    const userId = await getOwnerId();

    const existing = await prisma.resumeVersion.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!existing) return apiError("Resume not found.", 404);

    const parsed = updateResumeSchema.safeParse(await request.json());
    if (!parsed.success) return apiValidationError(parsed.error);

    const { isMaster, ...rest } = parsed.data;

    const resume = await prisma.$transaction(async (tx) => {
      if (isMaster === true) {
        await tx.resumeVersion.updateMany({
          where: { userId, isMaster: true, id: { not: id } },
          data: { isMaster: false },
        });
      }

      return tx.resumeVersion.update({
        where: { id },
        data: { ...rest, ...(isMaster === undefined ? {} : { isMaster }) },
        select: { id: true, name: true, isMaster: true },
      });
    });

    return apiSuccess(resume);
  });
}

export async function DELETE(
  _request: NextRequest,
  context: RouteContext<"/api/resumes/[id]">,
) {
  return handleRoute(async () => {
    const { id } = await context.params;
    const userId = await getOwnerId();

    const resume = await prisma.resumeVersion.findFirst({
      where: { id, userId },
      select: { id: true, filePathname: true, isMaster: true },
    });
    if (!resume) return apiError("Resume not found.", 404);

    // Delete the row first: an orphaned file is harmless, but a row pointing at
    // a file that no longer exists breaks every page that renders it.
    await prisma.resumeVersion.delete({ where: { id } });
    await getStorage().delete(resume.filePathname).catch((error) => {
      console.error("[resumes] file delete failed:", error);
    });

    // Keep a master designated so the analyzer always has a default.
    if (resume.isMaster) {
      const next = await prisma.resumeVersion.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });
      if (next) {
        await prisma.resumeVersion.update({
          where: { id: next.id },
          data: { isMaster: true },
        });
      }
    }

    return apiSuccess({ id });
  });
}
