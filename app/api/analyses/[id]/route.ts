import type { NextRequest } from "next/server";
import { apiError, apiSuccess, handleRoute } from "@/lib/api/response";
import { TOTAL_STAGES } from "@/lib/ai/pipeline";
import { prisma } from "@/lib/db/prisma";
import { getOwnerId } from "@/lib/db/user";

export async function GET(
  _request: NextRequest,
  context: RouteContext<"/api/analyses/[id]">,
) {
  return handleRoute(async () => {
    const { id } = await context.params;
    const userId = await getOwnerId();

    const analysis = await prisma.analysis.findFirst({
      where: { id, userId },
      include: {
        resumeVersion: { select: { id: true, name: true } },
        jobDescription: {
          select: { id: true, company: true, role: true, jobUrl: true },
        },
      },
    });
    if (!analysis) return apiError("Analysis not found.", 404);

    return apiSuccess({ ...analysis, totalStages: TOTAL_STAGES });
  });
}

export async function DELETE(
  _request: NextRequest,
  context: RouteContext<"/api/analyses/[id]">,
) {
  return handleRoute(async () => {
    const { id } = await context.params;
    const userId = await getOwnerId();

    const analysis = await prisma.analysis.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!analysis) return apiError("Analysis not found.", 404);

    await prisma.analysis.delete({ where: { id } });
    return apiSuccess({ id });
  });
}
