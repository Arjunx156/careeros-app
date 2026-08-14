import type { ApplicationStatus } from "@/lib/generated/prisma/enums";

/**
 * The application pipeline.
 *
 * Order here is the order of the kanban columns and the natural progression of
 * an application, so "forward" and "backward" moves are computable rather than
 * hardcoded per column.
 */
export const APPLICATION_STATUSES = [
  "wishlist",
  "preparing",
  "applied",
  "recruiter_screen",
  "interview",
  "final_round",
  "offer",
  "rejected",
  "withdrawn",
] as const satisfies readonly ApplicationStatus[];

export type StatusConfig = {
  label: string;
  /** Column accent, per docs/04_UI_UX_Design_Brief.md. */
  accent: string;
  badge: string;
  /** Terminal statuses do not count as "in flight". */
  isTerminal: boolean;
};

export const STATUS_CONFIG: Record<ApplicationStatus, StatusConfig> = {
  wishlist: {
    label: "Wishlist",
    accent: "bg-neutral-300",
    badge: "bg-surface-hover text-ink-secondary border-line",
    isTerminal: false,
  },
  preparing: {
    label: "Preparing",
    accent: "bg-neutral-400",
    badge: "bg-surface-hover text-ink-secondary border-line",
    isTerminal: false,
  },
  applied: {
    label: "Applied",
    accent: "bg-blue-500",
    badge: "bg-info-bg text-info border-blue-200",
    isTerminal: false,
  },
  recruiter_screen: {
    label: "Recruiter Screen",
    accent: "bg-amber-500",
    badge: "bg-warning-bg text-warning border-amber-200",
    isTerminal: false,
  },
  interview: {
    label: "Interview",
    accent: "bg-brand-500",
    badge: "bg-brand-50 text-brand-700 border-brand-200",
    isTerminal: false,
  },
  final_round: {
    label: "Final Round",
    accent: "bg-brand-600",
    badge: "bg-brand-50 text-brand-700 border-brand-200",
    isTerminal: false,
  },
  offer: {
    label: "Offer",
    accent: "bg-emerald-500",
    badge: "bg-success-bg text-success border-emerald-200",
    isTerminal: true,
  },
  rejected: {
    label: "Rejected",
    accent: "bg-red-500",
    badge: "bg-danger-bg text-danger border-red-200",
    isTerminal: true,
  },
  withdrawn: {
    label: "Withdrawn",
    accent: "bg-neutral-400",
    badge: "bg-surface-hover text-ink-muted border-line",
    isTerminal: true,
  },
};

export function statusLabel(status: ApplicationStatus): string {
  return STATUS_CONFIG[status].label;
}

/** Did this move advance the application, or send it back? */
export function statusDirection(
  from: ApplicationStatus,
  to: ApplicationStatus,
): "forward" | "backward" | "same" {
  const fromIndex = APPLICATION_STATUSES.indexOf(from);
  const toIndex = APPLICATION_STATUSES.indexOf(to);

  if (fromIndex === toIndex) return "same";
  return toIndex > fromIndex ? "forward" : "backward";
}

export const APPLICATION_METHODS = [
  { value: "direct", label: "Direct" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "referral", label: "Referral" },
  { value: "recruiter", label: "Recruiter" },
  { value: "job_board", label: "Job Board" },
  { value: "other", label: "Other" },
] as const;

export const WORK_TYPES = [
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "onsite", label: "On-site" },
] as const;
