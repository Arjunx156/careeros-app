"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import {
  ArrowRight,
  CircleDot,
  ExternalLink,
  FileText,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { Select } from "@/components/ui/field";
import {
  APPLICATION_STATUSES,
  STATUS_CONFIG,
  statusLabel,
} from "@/lib/applications/status";
import { BAND_TEXT, scoreBand } from "@/lib/score";
import { cn } from "@/lib/utils";
import type { ApplicationStatus } from "@/lib/generated/prisma/enums";

type TimelineEvent = {
  id: string;
  eventType: string;
  description: string;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string | Date;
};

type Interview = {
  id: string;
  stage: string;
  scheduledAt: string | Date | null;
  format: string | null;
  interviewers: string[];
  outcome: string | null;
  notes: string | null;
};

type Message = {
  id: string;
  type: string;
  content: string;
  status: string;
  sentAt: string | Date | null;
};

export type ApplicationDetailData = {
  id: string;
  company: string;
  role: string;
  status: ApplicationStatus;
  location: string | null;
  country: string | null;
  workType: string | null;
  jobUrl: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  applicationDate: string | Date | null;
  applicationMethod: string | null;
  coverLetterUsed: boolean;
  referralPerson: string | null;
  recruiterName: string | null;
  recruiterEmail: string | null;
  hiringManagerName: string | null;
  matchScore: number | null;
  nextFollowupDate: string | Date | null;
  rejectionReason: string | null;
  notes: string | null;
  resumeVersion: { id: string; name: string } | null;
  analysis: { id: string; overallScore: number | null; status: string } | null;
  interviews: Interview[];
  messages: Message[];
  timelineEvents: TimelineEvent[];
};

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "analysis", label: "Analysis" },
  { id: "interviews", label: "Interviews" },
  { id: "messages", label: "Messages" },
  { id: "timeline", label: "Timeline" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line-subtle py-2 last:border-0">
      <dt className="text-label text-ink-secondary">{label}</dt>
      <dd className="text-right text-label font-medium text-ink">{value ?? "—"}</dd>
    </div>
  );
}

function toDate(value: string | Date | null): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function ApplicationDetail({
  application,
}: {
  application: ApplicationDetailData;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("overview");
  const [status, setStatus] = useState(application.status);
  const [isSaving, setIsSaving] = useState(false);

  async function changeStatus(next: ApplicationStatus) {
    const previous = status;
    setStatus(next);
    setIsSaving(true);

    try {
      const response = await fetch(`/api/applications/${application.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!response.ok) throw new Error();

      toast.success(`Moved to ${statusLabel(next)}.`);
      router.refresh();
    } catch {
      setStatus(previous);
      toast.error("Could not update the status.");
    } finally {
      setIsSaving(false);
    }
  }

  const applied = toDate(application.applicationDate);
  const followUp = toDate(application.nextFollowupDate);
  const salary =
    application.salaryMin || application.salaryMax
      ? `${application.salaryCurrency ?? ""} ${application.salaryMin ?? "?"}–${application.salaryMax ?? "?"}`.trim()
      : null;

  return (
    <div className="space-y-5">
      {/* Hero */}
      <section className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-page-title text-ink">{application.company}</h1>
            <p className="mt-0.5 text-body text-ink-secondary">{application.role}</p>
            <p className="mt-1 text-label text-ink-muted">
              {[application.location, application.country, application.workType]
                .filter(Boolean)
                .join(" · ") || "No location recorded"}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {application.matchScore !== null ? (
              <div className="text-right">
                <p className="section-label">Match</p>
                <p
                  className={cn(
                    "tabular text-[26px] leading-none font-bold",
                    BAND_TEXT[scoreBand(application.matchScore)],
                  )}
                >
                  {application.matchScore}
                </p>
              </div>
            ) : null}

            <div>
              <label htmlFor="status" className="section-label mb-1 block">
                Status
              </label>
              <Select
                id="status"
                value={status}
                disabled={isSaving}
                onChange={(event) =>
                  changeStatus(event.target.value as ApplicationStatus)
                }
                className="w-44"
              >
                {APPLICATION_STATUSES.map((option) => (
                  <option key={option} value={option}>
                    {STATUS_CONFIG[option].label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Application sections"
        className="flex gap-1 overflow-x-auto border-b border-line"
      >
        {TABS.map((item) => {
          const isActive = tab === item.id;
          const count =
            item.id === "interviews"
              ? application.interviews.length
              : item.id === "messages"
                ? application.messages.length
                : item.id === "timeline"
                  ? application.timelineEvents.length
                  : null;

          return (
            <button
              key={item.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => setTab(item.id)}
              className={cn(
                "-mb-px shrink-0 border-b-2 px-3 py-2 text-body font-medium transition-colors",
                isActive
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-ink-secondary hover:text-ink",
              )}
            >
              {item.label}
              {count !== null && count > 0 ? (
                <span className="tabular ml-1.5 text-label text-ink-muted">{count}</span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Panels */}
      {tab === "overview" ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <section className="card p-5">
            <h2 className="text-section text-ink">Application</h2>
            <dl className="mt-3">
              <DetailRow
                label="Applied"
                value={applied ? format(applied, "d MMM yyyy") : "—"}
              />
              <DetailRow label="Method" value={application.applicationMethod ?? "—"} />
              <DetailRow
                label="Cover letter"
                value={application.coverLetterUsed ? "Sent" : "No"}
              />
              <DetailRow label="Referral" value={application.referralPerson ?? "—"} />
              <DetailRow label="Salary" value={salary ?? "—"} />
              <DetailRow
                label="Follow up"
                value={followUp ? format(followUp, "d MMM yyyy") : "—"}
              />
              <DetailRow
                label="Resume used"
                value={
                  application.resumeVersion ? (
                    <Link
                      href={`/resume-library/${application.resumeVersion.id}`}
                      className="text-brand-600 hover:underline"
                    >
                      {application.resumeVersion.name}
                    </Link>
                  ) : (
                    "—"
                  )
                }
              />
              <DetailRow
                label="Job posting"
                value={
                  application.jobUrl ? (
                    <a
                      href={application.jobUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-brand-600 hover:underline"
                    >
                      Open
                      <ExternalLink aria-hidden className="size-3" />
                    </a>
                  ) : (
                    "—"
                  )
                }
              />
            </dl>
          </section>

          <section className="card p-5">
            <h2 className="text-section text-ink">Contacts</h2>
            <dl className="mt-3">
              <DetailRow label="Recruiter" value={application.recruiterName ?? "—"} />
              <DetailRow label="Recruiter email" value={application.recruiterEmail ?? "—"} />
              <DetailRow
                label="Hiring manager"
                value={application.hiringManagerName ?? "—"}
              />
            </dl>

            {application.rejectionReason ? (
              <div className="mt-4 rounded-[var(--radius-control)] bg-danger-bg px-3 py-2.5">
                <p className="section-label text-danger">Rejection reason</p>
                <p className="mt-0.5 text-body text-ink-secondary">
                  {application.rejectionReason}
                </p>
              </div>
            ) : null}

            {application.notes ? (
              <div className="mt-4">
                <h3 className="section-label mb-1">Notes</h3>
                <p className="text-body whitespace-pre-wrap text-ink-secondary">
                  {application.notes}
                </p>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}

      {tab === "analysis" ? (
        <section className="card p-5">
          {application.analysis ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-section text-ink">Linked analysis</h2>
                <p className="mt-0.5 text-body text-ink-secondary">
                  Scored {application.analysis.overallScore ?? "—"} / 100
                </p>
              </div>
              <Link
                href={`/job-analyzer/${application.analysis.id}`}
                className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-control)] bg-brand-600 px-4 text-body font-medium text-white transition-colors hover:bg-brand-700"
              >
                View full analysis
                <ArrowRight aria-hidden className="size-4" />
              </Link>
            </div>
          ) : (
            <div className="py-6 text-center">
              <FileText aria-hidden className="mx-auto size-9 text-line" strokeWidth={1.5} />
              <p className="mt-3 text-card-title text-ink">No analysis linked</p>
              <p className="mt-1 text-body text-ink-secondary">
                Run this job through the analyzer to see your match score and gaps.
              </p>
              <Link
                href="/job-analyzer"
                className="mt-4 inline-flex h-10 items-center rounded-[var(--radius-control)] bg-brand-600 px-4 text-body font-medium text-white transition-colors hover:bg-brand-700"
              >
                Open Job Analyzer
              </Link>
            </div>
          )}
        </section>
      ) : null}

      {tab === "interviews" ? (
        <section className="card p-5">
          <h2 className="text-section text-ink">Interviews</h2>
          {application.interviews.length === 0 ? (
            <p className="mt-3 text-body text-ink-secondary">
              No interviews recorded yet.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {application.interviews.map((interview) => {
                const when = toDate(interview.scheduledAt);
                return (
                  <li
                    key={interview.id}
                    className="rounded-[var(--radius-control)] border border-line p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-card-title text-ink">
                        {interview.stage.replace(/_/g, " ")}
                      </p>
                      <span className="text-label text-ink-muted">
                        {when ? format(when, "d MMM yyyy, HH:mm") : "Not scheduled"}
                      </span>
                    </div>
                    <p className="mt-1 text-label text-ink-secondary">
                      {[
                        interview.format,
                        interview.interviewers.join(", "),
                        interview.outcome,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    {interview.notes ? (
                      <p className="mt-2 text-body whitespace-pre-wrap text-ink-secondary">
                        {interview.notes}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : null}

      {tab === "messages" ? (
        <section className="card p-5">
          <h2 className="text-section text-ink">Messages</h2>
          {application.messages.length === 0 ? (
            <div className="py-6 text-center">
              <MessageSquare
                aria-hidden
                className="mx-auto size-9 text-line"
                strokeWidth={1.5}
              />
              <p className="mt-3 text-body text-ink-secondary">
                No messages logged for this application.
              </p>
            </div>
          ) : (
            <ul className="mt-4 space-y-2">
              {application.messages.map((message) => (
                <li
                  key={message.id}
                  className="rounded-[var(--radius-control)] border border-line p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-label font-medium text-ink">
                      {message.type.replace(/_/g, " ")}
                    </span>
                    <span className="text-label text-ink-muted">{message.status}</span>
                  </div>
                  <p className="mt-1.5 text-body whitespace-pre-wrap text-ink-secondary">
                    {message.content}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {tab === "timeline" ? (
        <section className="card p-5">
          <h2 className="text-section text-ink">Timeline</h2>
          <p className="mt-0.5 text-body text-ink-secondary">
            Every change to this application, recorded automatically.
          </p>

          <ol className="mt-4 space-y-0">
            {application.timelineEvents.map((event, index) => {
              const when = toDate(event.createdAt);
              const isLast = index === application.timelineEvents.length - 1;

              return (
                <li key={event.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <CircleDot aria-hidden className="size-3.5 shrink-0 text-brand-500" />
                    {!isLast ? <span className="w-px flex-1 bg-line" /> : null}
                  </div>

                  <div className={cn("min-w-0 flex-1", isLast ? "pb-0" : "pb-4")}>
                    <p className="text-body text-ink">{event.description}</p>
                    <p className="text-label text-ink-muted">
                      {when ? formatDistanceToNow(when, { addSuffix: true }) : ""}
                      {event.oldValue && event.newValue
                        ? ` · ${event.oldValue.replace(/_/g, " ")} → ${event.newValue.replace(/_/g, " ")}`
                        : ""}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ) : null}
    </div>
  );
}
