import type { ApplicationStatus } from "@/lib/generated/prisma/enums";

/**
 * Performance aggregation.
 *
 * Pure functions over rows so the arithmetic is testable without a database —
 * these numbers drive decisions about which resume to keep using, so a silent
 * off-by-one here is worse than a UI bug.
 */

export type PerformanceRow = {
  status: ApplicationStatus;
  resumeName: string | null;
  roleCategory: string | null;
  country: string | null;
  method: string | null;
};

/** Reached an interview loop or better. */
const INTERVIEW_STATUSES: ReadonlySet<ApplicationStatus> = new Set([
  "interview",
  "final_round",
  "offer",
]);

/** Actually submitted — wishlist and preparing are not attempts. */
const SUBMITTED_STATUSES: ReadonlySet<ApplicationStatus> = new Set([
  "applied",
  "recruiter_screen",
  "interview",
  "final_round",
  "offer",
  "rejected",
  "withdrawn",
]);

export type SegmentStat = {
  label: string;
  applications: number;
  interviews: number;
  offers: number;
  /** Null when there is not enough data to mean anything. */
  interviewRate: number | null;
};

/**
 * Below this, a percentage is noise dressed up as insight — one interview from
 * two applications is not a 50% rate. The App Flow doc calls for exactly this
 * guard.
 */
export const MIN_SEGMENT_SIZE = 3;

/**
 * Turn a stored value into something readable.
 *
 * Segment keys come straight from enum columns ("job_board"), and showing a
 * user their own data in database casing is sloppy.
 */
/** Values whose conventional casing is not derivable from the stored string. */
const LABEL_OVERRIDES: Record<string, string> = {
  linkedin: "LinkedIn",
  job_board: "Job Board",
  onsite: "On-site",
  ats: "ATS",
};

export function humanizeLabel(value: string): string {
  const override = LABEL_OVERRIDES[value.toLowerCase()];
  if (override) return override;

  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function aggregateBy(
  rows: readonly PerformanceRow[],
  key: (row: PerformanceRow) => string | null,
  fallbackLabel = "Not recorded",
): SegmentStat[] {
  const buckets = new Map<string, { applications: number; interviews: number; offers: number }>();

  for (const row of rows) {
    if (!SUBMITTED_STATUSES.has(row.status)) continue;

    const raw = key(row);
    const label = raw === null ? fallbackLabel : humanizeLabel(raw);
    const bucket = buckets.get(label) ?? { applications: 0, interviews: 0, offers: 0 };

    bucket.applications += 1;
    if (INTERVIEW_STATUSES.has(row.status)) bucket.interviews += 1;
    if (row.status === "offer") bucket.offers += 1;

    buckets.set(label, bucket);
  }

  return [...buckets.entries()]
    .map(([label, bucket]) => ({
      label,
      ...bucket,
      interviewRate:
        bucket.applications >= MIN_SEGMENT_SIZE
          ? Math.round((bucket.interviews / bucket.applications) * 100)
          : null,
    }))
    .sort(
      (a, b) =>
        (b.interviewRate ?? -1) - (a.interviewRate ?? -1) ||
        b.applications - a.applications ||
        a.label.localeCompare(b.label),
    );
}

export type TimePoint = { month: string; applications: number; interviews: number };

/**
 * Applications per month, with empty months included.
 *
 * Skipping a month with no applications would draw a line implying continuous
 * activity across a gap that actually happened.
 */
export function applicationsOverTime(
  dates: ReadonlyArray<{ date: Date; status: ApplicationStatus }>,
  monthsBack = 6,
): TimePoint[] {
  const points: TimePoint[] = [];
  const now = new Date();

  for (let offset = monthsBack - 1; offset >= 0; offset--) {
    const cursor = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;

    const inMonth = dates.filter((entry) => {
      const date = entry.date;
      return (
        date.getFullYear() === cursor.getFullYear() &&
        date.getMonth() === cursor.getMonth()
      );
    });

    points.push({
      month: key,
      applications: inMonth.length,
      interviews: inMonth.filter((entry) => INTERVIEW_STATUSES.has(entry.status)).length,
    });
  }

  return points;
}

/** Is there enough data anywhere for the page to be worth showing? */
export function hasEnoughData(rows: readonly PerformanceRow[]): boolean {
  return rows.filter((row) => SUBMITTED_STATUSES.has(row.status)).length >= 5;
}
