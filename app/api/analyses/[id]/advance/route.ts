import type { NextRequest } from "next/server";
import { apiError, apiSuccess, handleRoute } from "@/lib/api/response";
import { AiNotConfiguredError } from "@/lib/ai/gemini";
import { STAGES, TOTAL_STAGES, type StageContext } from "@/lib/ai/pipeline";
import { prisma } from "@/lib/db/prisma";
import { getOwnerId } from "@/lib/db/user";
import type { Prisma } from "@/lib/generated/prisma/client";

/**
 * Runs exactly ONE pipeline stage per request.
 *
 * This is what replaces a background job queue. Each call is short enough to
 * finish well inside any platform timeout, persists its own results, and is
 * independently retryable — a stage that fails does not cost the eight that
 * already succeeded.
 */
export const maxDuration = 120;

export async function POST(
  _request: NextRequest,
  context: RouteContext<"/api/analyses/[id]/advance">,
) {
  return handleRoute(async () => {
    const { id } = await context.params;
    const userId = await getOwnerId();

    const analysis = await prisma.analysis.findFirst({
      where: { id, userId },
      include: {
        resumeVersion: { select: { extractedText: true } },
        jobDescription: { select: { jdText: true } },
      },
    });
    if (!analysis) return apiError("Analysis not found.", 404);

    if (analysis.status === "complete" || analysis.stage >= TOTAL_STAGES) {
      return apiSuccess({
        stage: TOTAL_STAGES,
        totalStages: TOTAL_STAGES,
        done: true,
        status: "complete" as const,
      });
    }

    const stage = STAGES[analysis.stage];
    if (!stage) return apiError("Unknown pipeline stage.", 500);

    const resumeText = analysis.resumeVersion.extractedText ?? "";
    if (resumeText.trim().length === 0) {
      await prisma.analysis.update({
        where: { id },
        data: { status: "failed", stageError: "The resume has no extractable text." },
      });
      return apiError("The resume has no extractable text.", 422);
    }

    // Give later stages what earlier ones produced, rather than re-deriving it.
    const stageContext: StageContext = {
      resumeText,
      jdText: analysis.jobDescription.jdText,
      prior: {
        requirements: {
          mustHave: analysis.mustHaveRequirements ?? [],
          niceToHave: analysis.niceToHaveRequirements ?? [],
          responsibilities: analysis.responsibilities ?? [],
          softSkills: analysis.softSkills ?? [],
        },
        findings: {
          overallScore: analysis.overallScore,
          gaps: analysis.gaps ?? [],
          keywordsMissing: analysis.keywordsMissing,
          atsIssues: analysis.atsIssues ?? [],
          recruiterVerdict: analysis.recruiterVerdict,
          recruiterVerdictReason: analysis.recruiterVerdictReason,
        },
      } as Prisma.JsonObject,
    };

    try {
      const data = await stage.run(stageContext);
      const nextStage = analysis.stage + 1;
      const isDone = nextStage >= TOTAL_STAGES;

      await prisma.analysis.update({
        where: { id },
        data: {
          ...data,
          stage: nextStage,
          status: isDone ? "complete" : "processing",
          stageError: null,
        },
      });

      return apiSuccess({
        stage: nextStage,
        totalStages: TOTAL_STAGES,
        completedStage: stage.key,
        done: isDone,
        status: isDone ? ("complete" as const) : ("processing" as const),
      });
    } catch (error) {
      const message =
        error instanceof AiNotConfiguredError
          ? error.message
          : error instanceof Error
            ? error.message
            : "The analysis step failed.";

      // Record the failure but leave `stage` untouched, so retrying re-runs
      // only this step rather than restarting the whole analysis.
      await prisma.analysis.update({
        where: { id },
        data: { status: "failed", stageError: message },
      });

      console.error(`[analysis:${id}] stage "${stage.key}" failed:`, error);
      return apiError(message, 502);
    }
  });
}
