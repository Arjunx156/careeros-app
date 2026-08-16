import type { NextRequest } from "next/server";
import { apiError, apiSuccess, handleRoute } from "@/lib/api/response";
import { prisma } from "@/lib/db/prisma";
import { getOwnerId } from "@/lib/db/user";

export async function DELETE(
  _request: NextRequest,
  context: RouteContext<"/api/jobs/[id]">,
) {
  return handleRoute(async () => {
    const { id } = await context.params;
    const userId = await getOwnerId();

    // Counted before the delete, because the cascade takes the rows with it —
    // afterwards there is nothing left to count, and the caller needs to be
    // told what actually went.
    const job = await prisma.jobDescription.findFirst({
      where: { id, userId },
      select: {
        id: true,
        company: true,
        role: true,
        _count: { select: { analyses: true, applications: true } },
      },
    });

    // 404 rather than 403 — never confirm a record exists to someone who
    // does not own it.
    if (!job) return apiError("Job not found.", 404);

    // Analyses are `onDelete: Cascade` and go with the job; applications are
    // `onDelete: SetNull` and survive, unlinked. Both are declared in
    // prisma/schema.prisma — deleting the row here is enough for either.
    await prisma.jobDescription.delete({ where: { id } });

    return apiSuccess({
      id,
      deletedAnalyses: job._count.analyses,
      unlinkedApplications: job._count.applications,
    });
  });
}
