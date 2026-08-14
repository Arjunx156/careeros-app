import type { RelationshipStatus } from "@/lib/generated/prisma/enums";

/**
 * The networking relationship ladder, in the order a relationship actually
 * progresses. Order matters: the UI groups by it and "what's the next step?"
 * is derived from position rather than hardcoded per status.
 */
export const RELATIONSHIP_STATUSES = [
  "not_contacted",
  "connection_requested",
  "connected",
  "message_sent",
  "replied",
  "referral_requested",
  "referral_received",
  "interview_referral",
  "follow_up_required",
] as const satisfies readonly RelationshipStatus[];

export type RelationshipConfig = {
  label: string;
  badge: string;
  /** What to do next when a contact sits at this stage. */
  nextStep: string;
};

export const RELATIONSHIP_CONFIG: Record<RelationshipStatus, RelationshipConfig> = {
  not_contacted: {
    label: "Not contacted",
    badge: "bg-surface-hover text-ink-secondary border-line",
    nextStep: "Send a connection request",
  },
  connection_requested: {
    label: "Request sent",
    badge: "bg-surface-hover text-ink-secondary border-line",
    nextStep: "Wait for them to accept",
  },
  connected: {
    label: "Connected",
    badge: "bg-info-bg text-info border-blue-200",
    nextStep: "Send an opening message",
  },
  message_sent: {
    label: "Message sent",
    badge: "bg-info-bg text-info border-blue-200",
    nextStep: "Give it a few days, then follow up",
  },
  replied: {
    label: "Replied",
    badge: "bg-brand-50 text-brand-700 border-brand-200",
    nextStep: "Keep the conversation going",
  },
  referral_requested: {
    label: "Referral asked",
    badge: "bg-warning-bg text-warning border-amber-200",
    nextStep: "Wait, then check in politely",
  },
  referral_received: {
    label: "Referral received",
    badge: "bg-success-bg text-success border-emerald-200",
    nextStep: "Apply and thank them",
  },
  interview_referral: {
    label: "Referred to interview",
    badge: "bg-success-bg text-success border-emerald-200",
    nextStep: "Prepare, and keep them posted",
  },
  follow_up_required: {
    label: "Follow up",
    badge: "bg-danger-bg text-danger border-red-200",
    nextStep: "You owe them a reply",
  },
};

/** Message types the generator can produce, per docs/01_PRD.md feature 21. */
export const MESSAGE_TYPES = [
  {
    value: "connection_request",
    label: "Connection request",
    hint: "Under 300 characters — LinkedIn's limit.",
  },
  {
    value: "after_connection",
    label: "After they accept",
    hint: "Open the conversation without asking for anything yet.",
  },
  {
    value: "recruiter",
    label: "To a recruiter",
    hint: "Lead with fit for a specific role.",
  },
  {
    value: "hiring_manager",
    label: "To a hiring manager",
    hint: "Lead with what you would do for their team.",
  },
  {
    value: "follow_up",
    label: "Follow-up",
    hint: "For when the first message got no reply.",
  },
] as const;

export type MessageTypeValue = (typeof MESSAGE_TYPES)[number]["value"];
