"use client";

import Link from "next/link";
import { format } from "date-fns";
import { CalendarClock, MessageSquare, Users } from "lucide-react";
import { scoreBand, BAND_TEXT } from "@/lib/score";
import { cn } from "@/lib/utils";
import type { ApplicationStatus, WorkType } from "@/lib/generated/prisma/enums";

export type ApplicationCardData = {
  id: string;
  company: string;
  role: string;
  status: ApplicationStatus;
  location: string | null;
  workType: WorkType | null;
  applicationDate: Date | string | null;
  matchScore: number | null;
  nextFollowupDate: Date | string | null;
  resumeVersion: { id: string; name: string } | null;
  interviewCount: number;
  messageCount: number;
  /**
   * Computed on the server, not from Date.now() during render.
   *
   * Reading the clock while rendering is impure: the server and the client can
   * land on different sides of the deadline and disagree, which React reports
   * as a hydration mismatch.
   */
  isFollowUpOverdue: boolean;
};

function toDate(value: Date | string | null): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function ApplicationCardBody({
  application,
  isDragging = false,
}: {
  application: ApplicationCardData;
  isDragging?: boolean;
}) {
  const applied = toDate(application.applicationDate);
  const followUp = toDate(application.nextFollowupDate);
  const isOverdue = application.isFollowUpOverdue;

  return (
    <div
      className={cn(
        "rounded-[var(--radius-control)] border border-line bg-surface p-3 transition-shadow",
        isDragging ? "shadow-[var(--shadow-dropdown)]" : "shadow-[var(--shadow-card)]",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 flex-1 truncate text-card-title text-ink">
          {application.company}
        </p>
        {application.matchScore !== null ? (
          <span
            className={cn(
              "tabular shrink-0 text-label font-semibold",
              BAND_TEXT[scoreBand(application.matchScore)],
            )}
          >
            {application.matchScore}
          </span>
        ) : null}
      </div>

      <p className="mt-0.5 truncate text-body text-ink-secondary">{application.role}</p>

      {application.location || application.workType ? (
        <p className="mt-1 truncate text-label text-ink-muted">
          {[application.location, application.workType].filter(Boolean).join(" · ")}
        </p>
      ) : null}

      <div className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-label text-ink-muted">
        {applied ? <span>{format(applied, "d MMM")}</span> : null}

        {application.interviewCount > 0 ? (
          <span className="inline-flex items-center gap-1">
            <Users aria-hidden className="size-3" />
            {application.interviewCount}
          </span>
        ) : null}

        {application.messageCount > 0 ? (
          <span className="inline-flex items-center gap-1">
            <MessageSquare aria-hidden className="size-3" />
            {application.messageCount}
          </span>
        ) : null}

        {followUp ? (
          <span
            className={cn(
              "inline-flex items-center gap-1",
              isOverdue ? "font-medium text-danger" : "",
            )}
          >
            <CalendarClock aria-hidden className="size-3" />
            {format(followUp, "d MMM")}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/** Non-draggable variant, used in the table view and empty-state previews. */
export function ApplicationCardLink({
  application,
}: {
  application: ApplicationCardData;
}) {
  return (
    <Link href={`/applications/${application.id}`} className="block">
      <ApplicationCardBody application={application} />
    </Link>
  );
}
