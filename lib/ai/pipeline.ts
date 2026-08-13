import "server-only";

import type { Prisma } from "@/lib/generated/prisma/client";
import { generateStructured } from "@/lib/ai/gemini";
import {
  checkForFabricatedNumbers,
  redactFabricatedNumbers,
} from "@/lib/ai/fabrication-guard";
import { prompts } from "@/lib/ai/prompts";
import {
  actionPlanSchema,
  atsSchema,
  bulletsSchema,
  gapsSchema,
  jdExtractionSchema,
  keywordsSchema,
  recruiterSchema,
  scoringSchema,
  summarySchema,
} from "@/lib/ai/schemas";
import { zodToGemini } from "@/lib/ai/zod-to-gemini";
import { STAGE_DEFINITIONS } from "@/lib/analysis/stage-labels";

export type StageContext = {
  resumeText: string;
  jdText: string;
  /** Everything persisted by earlier stages, for prompts that build on them. */
  prior: Prisma.JsonObject;
};

export type Stage = {
  key: string;
  /** Shown in the progress UI while this stage runs. */
  label: string;
  run: (context: StageContext) => Promise<Prisma.AnalysisUpdateInput>;
};

/** Guard a model-authored string, retrying via redaction rather than discarding. */
function guard(suggestion: string, sources: readonly string[]): string {
  const check = checkForFabricatedNumbers(suggestion, sources);
  if (check.ok) return suggestion;

  // The wording is usually still an improvement — neutralise the invented
  // figure into a placeholder instead of throwing the rewrite away.
  return redactFabricatedNumbers(suggestion, check.fabricated);
}

export const STAGES: Stage[] = [
  {
    key: STAGE_DEFINITIONS[0].key,
    label: STAGE_DEFINITIONS[0].label,
    run: async ({ resumeText, jdText }) => {
      const result = await generateStructured({
        tier: "fast",
        systemInstruction: prompts.extract.system,
        prompt: prompts.extract.build({ resumeText, jdText }),
        schema: jdExtractionSchema,
        responseSchema: zodToGemini(jdExtractionSchema),
      });

      return {
        mustHaveRequirements: result.mustHave,
        niceToHaveRequirements: result.niceToHave,
        responsibilities: result.responsibilities,
        softSkills: result.softSkills,
        educationRequirements: result.educationRequirements,
        experienceRequirements: result.experienceRequirements,
      };
    },
  },

  {
    key: STAGE_DEFINITIONS[1].key,
    label: STAGE_DEFINITIONS[1].label,
    run: async ({ resumeText, jdText, prior }) => {
      const result = await generateStructured({
        tier: "deep",
        systemInstruction: prompts.score.system,
        prompt: prompts.score.build(
          { resumeText, jdText },
          JSON.stringify(prior.requirements ?? {}, null, 2),
        ),
        schema: scoringSchema,
        responseSchema: zodToGemini(scoringSchema),
        temperature: 0.2,
      });

      return {
        overallScore: result.overallScore,
        experienceScore: result.experienceScore,
        skillsScore: result.skillsScore,
        keywordAtsScore: result.keywordAtsScore,
        responsibilityScore: result.responsibilityScore,
        industryScore: result.industryScore,
        seniorityScore: result.seniorityScore,
        educationScore: result.educationScore,
        quantificationScore: result.quantificationScore,
        recruiterReadability: result.recruiterReadability,
        overallRecruiterAppeal: result.overallRecruiterAppeal,
      };
    },
  },

  {
    key: STAGE_DEFINITIONS[2].key,
    label: STAGE_DEFINITIONS[2].label,
    run: async ({ resumeText, jdText, prior }) => {
      const result = await generateStructured({
        tier: "deep",
        systemInstruction: prompts.gaps.system,
        prompt: prompts.gaps.build(
          { resumeText, jdText },
          JSON.stringify(prior.requirements ?? {}, null, 2),
        ),
        schema: gapsSchema,
        responseSchema: zodToGemini(gapsSchema),
      });

      return {
        gaps: result.gaps.map((gap) => ({
          ...gap,
          recommendation: guard(gap.recommendation, [resumeText, jdText]),
        })),
      };
    },
  },

  {
    key: STAGE_DEFINITIONS[3].key,
    label: STAGE_DEFINITIONS[3].label,
    run: async ({ resumeText, jdText }) => {
      const result = await generateStructured({
        tier: "deep",
        systemInstruction: prompts.bullets.system,
        prompt: prompts.bullets.build({ resumeText, jdText }),
        schema: bulletsSchema,
        responseSchema: zodToGemini(bulletsSchema),
      });

      return {
        bulletAnalysis: result.bullets.map((bullet) => ({
          ...bullet,
          // A rewrite may reuse any figure from the original bullet or anywhere
          // in the resume — but not one from the JD, which describes the
          // employer's numbers, not the candidate's.
          suggested: guard(bullet.suggested, [bullet.original, resumeText]),
        })),
      };
    },
  },

  {
    key: STAGE_DEFINITIONS[4].key,
    label: STAGE_DEFINITIONS[4].label,
    run: async ({ resumeText, jdText }) => {
      const result = await generateStructured({
        tier: "fast",
        systemInstruction: prompts.keywords.system,
        prompt: prompts.keywords.build({ resumeText, jdText }),
        schema: keywordsSchema,
        responseSchema: zodToGemini(keywordsSchema),
      });

      return {
        keywordsPresent: result.present,
        keywordsMissing: result.missing,
        keywordsOverused: result.overused,
      };
    },
  },

  {
    key: STAGE_DEFINITIONS[5].key,
    label: STAGE_DEFINITIONS[5].label,
    run: async ({ resumeText, jdText }) => {
      const result = await generateStructured({
        tier: "fast",
        systemInstruction: prompts.ats.system,
        prompt: prompts.ats.build({ resumeText, jdText }),
        schema: atsSchema,
        responseSchema: zodToGemini(atsSchema),
      });

      return { atsScore: result.atsScore, atsIssues: result.issues };
    },
  },

  {
    key: STAGE_DEFINITIONS[6].key,
    label: STAGE_DEFINITIONS[6].label,
    run: async ({ resumeText, jdText }) => {
      const result = await generateStructured({
        tier: "deep",
        systemInstruction: prompts.recruiter.system,
        prompt: prompts.recruiter.build({ resumeText, jdText }),
        schema: recruiterSchema,
        responseSchema: zodToGemini(recruiterSchema),
      });

      return {
        recruiterVerdict: result.verdict,
        recruiterVerdictReason: result.reason,
        recruiterAnswers: result.answers,
      };
    },
  },

  {
    key: STAGE_DEFINITIONS[7].key,
    label: STAGE_DEFINITIONS[7].label,
    run: async ({ resumeText, jdText, prior }) => {
      const result = await generateStructured({
        tier: "deep",
        systemInstruction: prompts.actionPlan.system,
        prompt: prompts.actionPlan.build(
          { resumeText, jdText },
          JSON.stringify(prior.findings ?? {}, null, 2),
        ),
        schema: actionPlanSchema,
        responseSchema: zodToGemini(actionPlanSchema),
      });

      return {
        actionPlan: result.actions.map((action) => ({
          ...action,
          example: guard(action.example, [resumeText]),
        })),
      };
    },
  },

  {
    key: STAGE_DEFINITIONS[8].key,
    label: STAGE_DEFINITIONS[8].label,
    run: async ({ resumeText, jdText }) => {
      const result = await generateStructured({
        tier: "fast",
        systemInstruction: prompts.summary.system,
        prompt: prompts.summary.build({ resumeText, jdText }),
        schema: summarySchema,
        responseSchema: zodToGemini(summarySchema),
      });

      return {
        currentSummary: result.currentSummary,
        recommendedSummary: guard(result.recommendedSummary, [resumeText]),
        summaryWhyBetter: result.whyBetter,
      };
    },
  },
];

export const TOTAL_STAGES = STAGES.length;

/** Labels for the client-side progress indicator. */
export const STAGE_LABELS = STAGE_DEFINITIONS.map((stage) => stage.label);
