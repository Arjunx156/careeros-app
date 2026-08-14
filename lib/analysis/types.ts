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
  /** Resume bullet ids backing this judgment, after validation dropped bad ones. */
  supportingBulletIds?: string[];
  /** Set by the validator when no cited bullet survived — rendered as "not evidenced". */
  unsupported?: boolean;
};

/**
 * Scored dimensions for a bullet.
 *
 * Kept as a named tuple so the UI averages exactly what the AI schema produces.
 * Previously the type declared eight fields while the schema emitted four; the
 * four missing ones read as undefined at runtime and the average rendered NaN.
 * TypeScript could not catch it because the data arrives as JSON from the
 * database, where the declared type is an assertion rather than a guarantee.
 */
export const BULLET_SCORE_FIELDS = [
  "clarity",
  "impact",
  "relevance",
  "starStructure",
] as const;

export type BulletScoreField = (typeof BULLET_SCORE_FIELDS)[number];

/** Field-to-label pairs, so the UI cannot drift from the schema again. */
export const BULLET_SCORE_LABELS: ReadonlyArray<{
  field: BulletScoreField;
  label: string;
}> = [
  { field: "clarity", label: "Clarity" },
  { field: "impact", label: "Impact" },
  { field: "relevance", label: "Relevance" },
  { field: "starStructure", label: "STAR structure" },
];

export type BulletItem = {
  /** Evidence id of the bullet this rewrites. */
  bulletId?: string;
  original: string;
  clarity: number;
  impact: number;
  relevance: number;
  starStructure: number;
  issues: string[];
  suggested: string;
  whatChanged: string;
};

/**
 * Average of whichever score fields are actually present.
 *
 * Returns null rather than NaN when none are, so callers must handle the
 * missing case instead of rendering a broken number.
 */
export function averageBulletScore(bullet: BulletItem): number | null {
  const values = BULLET_SCORE_FIELDS.map((field) => bullet[field]).filter(
    (value): value is number => typeof value === "number" && Number.isFinite(value),
  );

  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

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
