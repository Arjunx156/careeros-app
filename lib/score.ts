/** Score bands from docs/04_UI_UX_Design_Brief.md. */
export type ScoreBand = "excellent" | "good" | "fair" | "weak";

export function scoreBand(score: number): ScoreBand {
  if (score >= 85) return "excellent";
  if (score >= 70) return "good";
  if (score >= 55) return "fair";
  return "weak";
}

export const BAND_TEXT: Record<ScoreBand, string> = {
  excellent: "text-success",
  good: "text-brand-600",
  fair: "text-warning",
  weak: "text-danger",
};

export const BAND_BG: Record<ScoreBand, string> = {
  excellent: "bg-success",
  good: "bg-brand-600",
  fair: "bg-warning",
  weak: "bg-danger",
};

export const BAND_LABEL: Record<ScoreBand, string> = {
  excellent: "Excellent",
  good: "Good",
  fair: "Fair",
  weak: "Weak",
};

/** Stroke colors for the SVG gauge, which cannot use Tailwind classes. */
export const BAND_STROKE: Record<ScoreBand, string> = {
  excellent: "var(--color-success)",
  good: "var(--color-brand-600)",
  fair: "var(--color-warning)",
  weak: "var(--color-danger)",
};

export const REQUIREMENT_STYLE = {
  strong: {
    label: "Strongly demonstrated",
    dot: "bg-success",
    chip: "border-success/20 bg-success-bg text-success",
  },
  partial: {
    label: "Partially demonstrated",
    dot: "bg-warning",
    chip: "border-warning/20 bg-warning-bg text-warning",
  },
  missing: {
    label: "Missing",
    dot: "bg-danger",
    chip: "border-danger/20 bg-danger-bg text-danger",
  },
} as const;

export type RequirementStatus = keyof typeof REQUIREMENT_STYLE;
