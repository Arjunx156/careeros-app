import "server-only";

import type { Prisma } from "@/lib/generated/prisma/client";
import { generateStructured } from "@/lib/ai/gemini";
import { prompts } from "@/lib/ai/prompts";
import {
  jdExtractionSchema,
  judgmentSchema,
  synthesisSchema,
  type JdExtraction,
  type Judgment,
} from "@/lib/ai/schemas";
import { zodToGemini } from "@/lib/ai/zod-to-gemini";
import {
  analyzeAts,
  analyzeKeywords,
  analyzeReadability,
  quantificationRate,
} from "@/lib/analysis/deterministic";
import {
  allowedQuantitiesFor,
  redactFabricatedNumbers,
  validateClaims,
  type ValidationReport,
} from "@/lib/analysis/evidence";
import { parseResumeFacts, type ResumeFacts } from "@/lib/analysis/facts";
import { retrieveForRequirements } from "@/lib/analysis/retrieval";
import { STAGE_DEFINITIONS } from "@/lib/analysis/stage-labels";

export type StageContext = {
  resumeText: string;
  jdText: string;
  company: string;
  role: string;
  /** Outputs persisted by earlier stages. */
  prior: Prisma.JsonObject;
};

/**
 * A stage writes two things: real columns on the analyses row, and scratch data
 * merged into stage_data for later stages to read. Keeping them apart means a
 * stage cannot accidentally invent a column name and have it silently dropped.
 */
export type StageResult = {
  update: Prisma.AnalysisUpdateInput;
  data?: Record<string, unknown>;
};

export type Stage = {
  key: string;
  label: string;
  usesAi: boolean;
  run: (context: StageContext) => Promise<StageResult>;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function readPrior<T>(prior: Prisma.JsonObject, key: string): T | null {
  const value = prior[key];
  return value === undefined || value === null ? null : (value as T);
}

/** Merge deterministic and judged scores into one headline number. */
function computeOverallScore(
  judgment: Judgment,
  atsScore: number,
  keywordCoverage: number,
  quantification: number,
): number {
  // Weighted so the model's judgment dominates but measured signals still move
  // the number — a resume that scores well on fit but fails ATS should not
  // present as excellent.
  const weighted =
    judgment.experienceScore * 0.2 +
    judgment.skillsScore * 0.2 +
    judgment.responsibilityScore * 0.12 +
    judgment.industryScore * 0.08 +
    judgment.seniorityScore * 0.1 +
    judgment.educationScore * 0.05 +
    atsScore * 0.1 +
    keywordCoverage * 0.1 +
    quantification * 0.05;

  return Math.max(0, Math.min(100, Math.round(weighted)));
}

// ─── Stages ──────────────────────────────────────────────────────────────────

export const STAGES: Stage[] = [
  /**
   * 1. Extract — the only stage that reads the JD.
   * Cheap tier: this is structured reading, not judgment.
   */
  {
    key: STAGE_DEFINITIONS[0].key,
    label: STAGE_DEFINITIONS[0].label,
    usesAi: true,
    run: async ({ jdText, company, role }) => {
      const extraction = await generateStructured({
        tier: "fast",
        systemInstruction: prompts.extract.system,
        prompt: prompts.extract.build({ jdText, company, role }),
        schema: jdExtractionSchema,
        responseSchema: zodToGemini(jdExtractionSchema),
        // Extraction should be literal, not creative.
        temperature: 0.1,
        thinking: "off",
      });

      return {
        update: {
          mustHaveRequirements:
            extraction.mustHave as unknown as Prisma.InputJsonValue,
          niceToHaveRequirements:
            extraction.niceToHave as unknown as Prisma.InputJsonValue,
          responsibilities:
            extraction.responsibilities as unknown as Prisma.InputJsonValue,
          softSkills: extraction.softSkills as unknown as Prisma.InputJsonValue,
          educationRequirements:
            extraction.educationRequirements as unknown as Prisma.InputJsonValue,
          experienceRequirements:
            extraction.experienceRequirements as unknown as Prisma.InputJsonValue,
        },
        data: { extraction },
      };
    },
  },

  /**
   * 2. Measure — pure computation, zero API cost.
   *
   * Keyword matching, ATS structure, quantification and readability were
   * previously two LLM calls whose answers drifted between runs. Here they are
   * arithmetic: same resume, same numbers, every time.
   */
  {
    key: STAGE_DEFINITIONS[1].key,
    label: STAGE_DEFINITIONS[1].label,
    usesAi: false,
    run: async ({ resumeText, prior }) => {
      const extraction = readPrior<JdExtraction>(prior, "extraction");
      if (!extraction) throw new Error("Extraction stage has not run yet.");

      const facts = parseResumeFacts(resumeText);
      const keywords = analyzeKeywords(extraction.keyTerms, resumeText);
      const ats = analyzeAts(facts, resumeText);
      const readability = analyzeReadability(facts);

      const coverage =
        extraction.keyTerms.length === 0
          ? 100
          : Math.round(
              (keywords.present.length / extraction.keyTerms.length) * 100,
            );

      return {
        update: {
          keywordsPresent: keywords.present,
          keywordsMissing: keywords.missing,
          keywordsOverused: keywords.overused,
          atsScore: ats.score,
          atsIssues: ats.issues as unknown as Prisma.InputJsonValue,
          keywordAtsScore: Math.round((coverage + ats.score) / 2),
          quantificationScore: Math.round(quantificationRate(facts) * 100),
          recruiterReadability: readability.score,
        },
        data: {
          resumeFacts: facts,
          measurements: { keywordCoverage: coverage, readability },
        },
      };
    },
  },

  /**
   * 3. Judgment — scores, gaps and bullet rewrites from retrieved evidence.
   *
   * Receives only the bullets retrieved as relevant to each requirement, not
   * the whole resume, and every claim it makes must cite bullet ids.
   */
  {
    key: STAGE_DEFINITIONS[2].key,
    label: STAGE_DEFINITIONS[2].label,
    usesAi: true,
    run: async ({ prior }) => {
      const extraction = readPrior<JdExtraction>(prior, "extraction");
      const facts = readPrior<ResumeFacts>(prior, "resumeFacts");
      const measurements = readPrior<{ keywordCoverage: number }>(
        prior,
        "measurements",
      );
      if (!extraction || !facts)
        throw new Error("Earlier stages have not run yet.");

      const requirementTexts = [
        ...extraction.mustHave.map((r) => r.requirement),
        ...extraction.niceToHave.map((r) => r.requirement),
      ];

      const { byRequirement, bullets } = retrieveForRequirements(
        facts,
        requirementTexts,
      );

      const keywords = {
        present: (prior.keywordsPresent as string[]) ?? [],
        missing: (prior.keywordsMissing as string[]) ?? [],
        overused: [],
      };

      const judgment = await generateStructured({
        tier: "deep",
        systemInstruction: prompts.judgment.system,
        prompt: prompts.judgment.build({
          extraction,
          evidenceByRequirement: byRequirement,
          bullets,
          facts,
          keywords,
        }),
        schema: judgmentSchema,
        responseSchema: zodToGemini(judgmentSchema),
        temperature: 0.3,
      });

      // — Validation —
      const allowed = allowedQuantitiesFor(facts);

      const { claims: requirements, report: requirementReport } =
        validateClaims(
          judgment.requirements,
          (claim) => `${claim.current} ${claim.gap} ${claim.recommendation}`,
          facts,
        );

      // Bullet rewrites may only reuse figures from the bullet they rewrite.
      const bulletIndex = new Map(facts.evidence.map((b) => [b.id, b]));
      const redactedNumbers: string[] = [];

      const validatedBullets = judgment.bullets
        .filter((bullet) => bulletIndex.has(bullet.bulletId))
        .map((bullet) => {
          const redaction = redactFabricatedNumbers(bullet.suggested, allowed);
          redactedNumbers.push(...redaction.redacted);
          return { ...bullet, suggested: redaction.text };
        });

      const report: ValidationReport = {
        totalClaims: requirementReport.totalClaims + judgment.bullets.length,
        unsupportedClaims: requirementReport.unsupportedClaims,
        invalidCitations: requirementReport.invalidCitations,
        fabricatedNumbers: [
          ...new Set([
            ...requirementReport.fabricatedNumbers,
            ...redactedNumbers,
          ]),
        ],
      };

      const overallScore = computeOverallScore(
        judgment,
        (prior.atsScore as number) ?? 0,
        measurements?.keywordCoverage ?? 0,
        (prior.quantificationScore as number) ?? 0,
      );

      return {
        update: {
          experienceScore: judgment.experienceScore,
          skillsScore: judgment.skillsScore,
          responsibilityScore: judgment.responsibilityScore,
          industryScore: judgment.industryScore,
          seniorityScore: judgment.seniorityScore,
          educationScore: judgment.educationScore,
          overallRecruiterAppeal: judgment.overallRecruiterAppeal,
          overallScore,
          gaps: requirements as unknown as Prisma.InputJsonValue,
          bulletAnalysis: validatedBullets as unknown as Prisma.InputJsonValue,
          validationReport: report as unknown as Prisma.InputJsonValue,
        },
        data: {
          judgment: { ...judgment, requirements, bullets: validatedBullets },
        },
      };
    },
  },

  /**
   * 4. Synthesis — recruiter verdict, action plan, tailored summary.
   *
   * Never sees raw resume text; works from validated findings so it cannot
   * rediscover or reinvent the underlying facts.
   */
  {
    key: STAGE_DEFINITIONS[3].key,
    label: STAGE_DEFINITIONS[3].label,
    usesAi: true,
    run: async ({ prior }) => {
      const extraction = readPrior<JdExtraction>(prior, "extraction");
      const facts = readPrior<ResumeFacts>(prior, "resumeFacts");
      const judgment = readPrior<Judgment>(prior, "judgment");
      if (!extraction || !facts || !judgment) {
        throw new Error("Earlier stages have not run yet.");
      }

      const citedIds = new Set(
        judgment.requirements.flatMap((r) => r.supportingBulletIds),
      );
      // Include cited bullets plus a few more so the summary has material.
      const bullets = facts.evidence.filter(
        (b, index) => citedIds.has(b.id) || index < 6,
      );

      const synthesis = await generateStructured({
        tier: "deep",
        systemInstruction: prompts.synthesis.system,
        prompt: prompts.synthesis.build({
          extraction,
          judgment,
          ats: {
            score: (prior.atsScore as number) ?? 0,
            issues: (prior.atsIssues as never) ?? [],
          },
          keywords: {
            present: (prior.keywordsPresent as string[]) ?? [],
            missing: (prior.keywordsMissing as string[]) ?? [],
            overused: [],
          },
          bullets,
          currentSummary: facts.summaryText,
          overallScore: (prior.overallScore as number) ?? 0,
        }),
        schema: synthesisSchema,
        responseSchema: zodToGemini(synthesisSchema),
        temperature: 0.4,
      });

      const allowed = allowedQuantitiesFor(facts);
      const summary = redactFabricatedNumbers(
        synthesis.recommendedSummary,
        allowed,
      );

      const { claims: actionPlan } = validateClaims(
        synthesis.actionPlan,
        (item) => `${item.problem} ${item.solution} ${item.example}`,
        facts,
      );
      const { claims: recruiterAnswers } = validateClaims(
        synthesis.recruiterAnswers,
        (answer) => answer.answer,
        facts,
      );

      return {
        update: {
          recruiterVerdict: synthesis.recruiterVerdict,
          recruiterVerdictReason: synthesis.recruiterVerdictReason,
          recruiterAnswers:
            recruiterAnswers as unknown as Prisma.InputJsonValue,
          actionPlan: actionPlan as unknown as Prisma.InputJsonValue,
          currentSummary: facts.summaryText,
          recommendedSummary: summary.text,
          summaryWhyBetter: synthesis.summaryWhyBetter,
        },
      };
    },
  },
];

export const TOTAL_STAGES = STAGES.length;
