import type { RequirementStatus } from "@/lib/score";

/**
 * Read-side shapes for the analysis JSON columns.
 *
 * Prisma types these as `Json`, which is accurate but useless at the UI
 * boundary. These mirror the Zod schemas in lib/ai/schemas.ts — the write side
 * validates against those, so anything persisted conforms to these.
 */

export type RequirementItem = {
  requirement: string;
  context: string;
};

export type GapItem = {
  requirement: string;
  status: RequirementStatus;
  current: string;
  gap: string;
  recommendation: string;
};

export type BulletItem = {
  original: string;
  clarity: number;
  impact: number;
  relevance: number;
  quantification: number;
  actionVerb: number;
  jdAlignment: number;
  readability: number;
  starStructure: number;
  issues: string[];
  suggested: string;
  whatChanged: string;
};

export type AtsIssue = {
  level: "error" | "warning" | "info";
  area: string;
  message: string;
  fix: string;
};

export type RecruiterAnswer = {
  question: string;
  answer: string;
  answerable: boolean;
};

export type ActionItem = {
  priority: number;
  title: string;
  problem: string;
  why: string;
  solution: string;
  example: string;
  effort: "quick" | "moderate" | "significant";
};

/** The analysis as the results UI consumes it. */
export type AnalysisRecord = {
  id: string;
  status: "pending" | "processing" | "complete" | "failed";
  stage: number;
  stageError: string | null;

  overallScore: number | null;
  experienceScore: number | null;
  skillsScore: number | null;
  keywordAtsScore: number | null;
  responsibilityScore: number | null;
  industryScore: number | null;
  seniorityScore: number | null;
  educationScore: number | null;
  quantificationScore: number | null;
  recruiterReadability: number | null;
  overallRecruiterAppeal: number | null;

  mustHaveRequirements: RequirementItem[] | null;
  niceToHaveRequirements: RequirementItem[] | null;
  gaps: GapItem[] | null;
  bulletAnalysis: BulletItem[] | null;

  keywordsPresent: string[];
  keywordsMissing: string[];
  keywordsOverused: string[];

  atsScore: number | null;
  atsIssues: AtsIssue[] | null;

  recruiterVerdict: "strong" | "potential" | "weak" | null;
  recruiterVerdictReason: string | null;
  recruiterAnswers: RecruiterAnswer[] | null;

  actionPlan: ActionItem[] | null;

  currentSummary: string | null;
  recommendedSummary: string | null;
  summaryWhyBetter: string | null;
};

/**
 * Narrow a Prisma row to the read-side shape.
 *
 * The cast is safe because every write goes through a Zod schema first; this
 * function is the single place that assumption is recorded.
 */
export function toAnalysisRecord(row: unknown): AnalysisRecord {
  return row as AnalysisRecord;
}
