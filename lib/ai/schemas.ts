import { z } from "zod";

/**
 * Output schemas for every pipeline stage.
 *
 * These are the contract between the model and the database. Anything that
 * fails to parse here never reaches Postgres — the stage retries instead.
 */

const score = z.number().int().min(0).max(100);
const requirementStatus = z.enum(["strong", "partial", "missing"]);

// ─── Stage 1: JD extraction ──────────────────────────────────────────────────

const requirementItem = z.object({
  requirement: z.string().min(1),
  /** Why the JD asks for it — helps the user judge whether it is negotiable. */
  context: z.string(),
});

export const jdExtractionSchema = z.object({
  company: z.string(),
  role: z.string(),
  seniority: z.string(),
  mustHave: z.array(requirementItem),
  niceToHave: z.array(requirementItem),
  responsibilities: z.array(z.string()),
  softSkills: z.array(z.string()),
  educationRequirements: z.array(z.string()),
  experienceRequirements: z.array(z.string()),
});
export type JdExtraction = z.infer<typeof jdExtractionSchema>;

// ─── Stage 2: Scoring ────────────────────────────────────────────────────────

export const scoringSchema = z.object({
  overallScore: score,
  experienceScore: score,
  skillsScore: score,
  keywordAtsScore: score,
  responsibilityScore: score,
  industryScore: score,
  seniorityScore: score,
  educationScore: score,
  quantificationScore: score,
  recruiterReadability: score,
  overallRecruiterAppeal: score,
  reasoning: z.string(),
});
export type Scoring = z.infer<typeof scoringSchema>;

// ─── Stage 3: Gap analysis ───────────────────────────────────────────────────

export const gapsSchema = z.object({
  gaps: z.array(
    z.object({
      requirement: z.string().min(1),
      status: requirementStatus,
      /** What the resume currently shows for this requirement. */
      current: z.string(),
      /** What is missing, stated plainly. */
      gap: z.string(),
      /** Exactly what to add — phrased so it is only actionable if true. */
      recommendation: z.string(),
    }),
  ),
});
export type Gaps = z.infer<typeof gapsSchema>;

// ─── Stage 4: Bullet analysis ────────────────────────────────────────────────

export const bulletsSchema = z.object({
  bullets: z.array(
    z.object({
      original: z.string().min(1),
      clarity: score,
      impact: score,
      relevance: score,
      quantification: score,
      actionVerb: score,
      jdAlignment: score,
      readability: score,
      starStructure: score,
      issues: z.array(z.string()),
      suggested: z.string(),
      whatChanged: z.string(),
    }),
  ),
});
export type Bullets = z.infer<typeof bulletsSchema>;

// ─── Stage 5: Keywords ───────────────────────────────────────────────────────

export const keywordsSchema = z.object({
  present: z.array(z.string()),
  missing: z.array(z.string()),
  overused: z.array(z.string()),
  byCategory: z.object({
    technical: z.array(z.string()),
    functional: z.array(z.string()),
    industry: z.array(z.string()),
    softSkills: z.array(z.string()),
  }),
});
export type Keywords = z.infer<typeof keywordsSchema>;

// ─── Stage 6: ATS ────────────────────────────────────────────────────────────

export const atsSchema = z.object({
  atsScore: score,
  issues: z.array(
    z.object({
      level: z.enum(["error", "warning", "info"]),
      area: z.string(),
      message: z.string(),
      fix: z.string(),
    }),
  ),
});
export type Ats = z.infer<typeof atsSchema>;

// ─── Stage 7: Recruiter 10-second test ───────────────────────────────────────

export const recruiterSchema = z.object({
  verdict: z.enum(["strong", "potential", "weak"]),
  reason: z.string().min(1),
  answers: z.array(
    z.object({
      question: z.string().min(1),
      answer: z.string(),
      /** Whether a recruiter could answer this in the first 10 seconds. */
      answerable: z.boolean(),
    }),
  ),
});
export type Recruiter = z.infer<typeof recruiterSchema>;

// ─── Stage 8: Action plan ────────────────────────────────────────────────────

export const actionPlanSchema = z.object({
  actions: z.array(
    z.object({
      priority: z.number().int().min(1),
      title: z.string().min(1),
      problem: z.string(),
      why: z.string(),
      solution: z.string(),
      example: z.string(),
      effort: z.enum(["quick", "moderate", "significant"]),
    }),
  ),
});
export type ActionPlan = z.infer<typeof actionPlanSchema>;

// ─── Stage 9: Summary ────────────────────────────────────────────────────────

export const summarySchema = z.object({
  currentSummary: z.string(),
  recommendedSummary: z.string().min(1),
  whyBetter: z.string().min(1),
});
export type Summary = z.infer<typeof summarySchema>;
