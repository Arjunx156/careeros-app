import { z } from "zod";

/**
 * Output schemas for the three LLM stages.
 *
 * Two design rules run through all of them:
 *
 *   1. Every judgment cites evidence. `supportingBulletIds` refers to bullet
 *      ids produced by lib/analysis/facts.ts. A citation to an id that does not
 *      exist is caught by lib/analysis/evidence.ts, and the claim is marked
 *      unsupported rather than presented as fact.
 *
 *   2. Nothing measurable is asked of the model. Keyword presence, ATS
 *      structure and quantification rates are computed in code, so the model is
 *      only ever asked for judgment and language.
 */

const score = z.number().int().min(0).max(100);
const requirementStatus = z.enum(["strong", "partial", "missing"]);

/**
 * Evidence ids: b1.. for bullets, s1 for the summary, k1 for the skills list.
 *
 * The prefixes matter. A resume often evidences a skill only in its skills
 * section — an earlier version of this pattern accepted bullet ids alone, so
 * the model's correct citation of k1 for SQL was rejected as malformed and the
 * requirement came back "not evidenced".
 */
const bulletId = z.string().regex(/^[bsk]\d+$/);
const citations = z.array(bulletId).default([]);

// ─── Stage 1: JD extraction (fast tier, JD text only) ────────────────────────

const requirement = z.object({
  requirement: z.string().min(1),
  /** Verbatim phrase from the JD, so the user can see where it came from. */
  sourcePhrase: z.string().default(""),
});

export const jdExtractionSchema = z.object({
  company: z.string().default(""),
  role: z.string().default(""),
  seniority: z.string().default(""),
  mustHave: z.array(requirement).max(12),
  niceToHave: z.array(requirement).max(10),
  responsibilities: z.array(z.string()).max(10),
  softSkills: z.array(z.string()).max(8),
  educationRequirements: z.array(z.string()).max(5),
  experienceRequirements: z.array(z.string()).max(5),
  /** Terms worth checking for in the resume — matching is done in code. */
  keyTerms: z.array(z.string()).max(30),
});
export type JdExtraction = z.infer<typeof jdExtractionSchema>;

// ─── Stage 2: Judgment (deep tier, retrieved evidence only) ──────────────────

const requirementJudgment = z.object({
  requirement: z.string().min(1),
  status: requirementStatus,
  /** What the cited evidence actually shows. */
  current: z.string(),
  /** What is missing, stated plainly. */
  gap: z.string(),
  /** Only actionable if genuinely true of the candidate. */
  recommendation: z.string(),
  supportingBulletIds: citations,
});

const bulletJudgment = z.object({
  bulletId,
  /** Repeated so the UI can render without a second lookup. */
  original: z.string(),
  clarity: score,
  impact: score,
  relevance: score,
  starStructure: score,
  issues: z.array(z.string()).max(4),
  /** Rewrite. Must not introduce figures absent from the original. */
  suggested: z.string(),
  whatChanged: z.string(),
});

/**
 * Split across two Gemini calls rather than one combined schema.
 *
 * requirementJudgment and bulletJudgment are each a handful of fields deep,
 * and either one's array paired with the scores below decodes fine on its
 * own. Combined into one responseSchema, Gemini rejects the request outright
 * with a bare 400 INVALID_ARGUMENT and no further detail — confirmed by
 * bisecting the schema directly against the API: two full-shape copies of
 * bulletJudgment alone (no requirementJudgment involved) already trip it,
 * while the same two arrays with trivial one-field item shapes do not. This
 * is a real complexity/size ceiling on structured output, not a bug in any
 * one field's shape.
 */
export const judgmentScoresSchema = z.object({
  // Scores the model is genuinely better placed to judge than code.
  experienceScore: score,
  skillsScore: score,
  responsibilityScore: score,
  industryScore: score,
  seniorityScore: score,
  educationScore: score,
  overallRecruiterAppeal: score,
  scoreReasoning: z.string(),

  requirements: z.array(requirementJudgment).max(20),
});
export type JudgmentScores = z.infer<typeof judgmentScoresSchema>;

export const judgmentBulletsSchema = z.object({
  bullets: z.array(bulletJudgment).max(15),
});
export type JudgmentBullets = z.infer<typeof judgmentBulletsSchema>;

/** The two calls' results merged back into the one shape the rest of the app expects. */
export type Judgment = JudgmentScores & JudgmentBullets;

// ─── Stage 3: Synthesis (deep tier, prior stage outputs only) ────────────────

const actionItem = z.object({
  priority: z.number().int().min(1).max(10),
  title: z.string().min(1),
  problem: z.string(),
  why: z.string(),
  solution: z.string(),
  example: z.string(),
  supportingBulletIds: citations,
});

const recruiterAnswer = z.object({
  question: z.string().min(1),
  answer: z.string(),
  supportingBulletIds: citations,
});

export const synthesisSchema = z.object({
  recruiterVerdict: z.enum(["strong", "potential", "weak"]),
  recruiterVerdictReason: z.string(),
  recruiterAnswers: z.array(recruiterAnswer).max(8),
  actionPlan: z.array(actionItem).max(8),
  recommendedSummary: z.string(),
  summaryWhyBetter: z.string(),
});
export type Synthesis = z.infer<typeof synthesisSchema>;
