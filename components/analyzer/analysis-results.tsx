"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  CircleAlert,
  Info,
  Lightbulb,
  Minus,
  Plus,
  Repeat,
  ShieldCheck,
} from "lucide-react";
import { ScoreBar, ScoreGauge } from "@/components/analyzer/score-gauge";
import {
  BAND_TEXT,
  REQUIREMENT_STYLE,
  scoreBand,
  type RequirementStatus,
} from "@/lib/score";
import { cn } from "@/lib/utils";
import {
  averageBulletScore,
  BULLET_SCORE_LABELS,
  type AnalysisRecord,
} from "@/lib/analysis/types";

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="text-section text-ink">{title}</h2>
      {description ? (
        <p className="mt-0.5 text-body text-ink-secondary">{description}</p>
      ) : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/**
 * Shown when the evidence validator could not tie a claim to a real resume
 * bullet. The claim is still displayed — hiding it would be its own kind of
 * dishonesty — but it is labelled so it is never mistaken for a finding.
 */
function NotEvidencedChip() {
  return (
    <span
      title="No supporting line was found on your resume"
      className="inline-flex items-center gap-1 rounded-[var(--radius-badge)] border border-warning/30 bg-warning-bg px-1.5 py-0.5 text-label font-medium text-warning"
    >
      <AlertTriangle aria-hidden className="size-3" />
      Not evidenced
    </span>
  );
}

function StatusChip({ status }: { status: RequirementStatus }) {
  const style = REQUIREMENT_STYLE[status];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-[var(--radius-badge)] border px-2 py-0.5 text-label font-medium",
        style.chip,
      )}
    >
      <span aria-hidden className={cn("size-1.5 rounded-full", style.dot)} />
      {style.label}
    </span>
  );
}

export function AnalysisResults({ analysis }: { analysis: AnalysisRecord }) {
  const [openBullet, setOpenBullet] = useState<number | null>(0);

  const subScores = [
    { label: "Experience", score: analysis.experienceScore },
    { label: "Skills", score: analysis.skillsScore },
    { label: "Keyword / ATS", score: analysis.keywordAtsScore },
    { label: "Responsibilities", score: analysis.responsibilityScore },
    { label: "Industry", score: analysis.industryScore },
    { label: "Seniority", score: analysis.seniorityScore },
    { label: "Education", score: analysis.educationScore },
    { label: "Quantification", score: analysis.quantificationScore },
    { label: "Recruiter readability", score: analysis.recruiterReadability },
    { label: "Recruiter appeal", score: analysis.overallRecruiterAppeal },
  ].filter((item): item is { label: string; score: number } => item.score !== null);

  const gaps = analysis.gaps ?? [];
  const bullets = analysis.bulletAnalysis ?? [];
  const atsIssues = analysis.atsIssues ?? [];
  const actionPlan = analysis.actionPlan ?? [];
  const recruiterAnswers = analysis.recruiterAnswers ?? [];
  const mustHave = analysis.mustHaveRequirements ?? [];
  const niceToHave = analysis.niceToHaveRequirements ?? [];

  const gapByRequirement = new Map(
    gaps.map((gap) => [gap.requirement.toLowerCase().trim(), gap.status]),
  );

  return (
    <div className="space-y-5">
      {/* Overall score + sub-scores */}
      <section className="card p-5 sm:p-6">
        <div className="grid gap-6 lg:grid-cols-[auto_1fr] lg:gap-8">
          <div className="flex justify-center lg:justify-start">
            {analysis.overallScore !== null ? (
              <ScoreGauge score={analysis.overallScore} />
            ) : null}
          </div>

          <div>
            <h2 className="text-section text-ink">Score breakdown</h2>
            <div className="mt-4 grid gap-x-8 gap-y-3.5 sm:grid-cols-2">
              {subScores.map((item) => (
                <ScoreBar key={item.label} label={item.label} score={item.score} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* JD requirements */}
      {mustHave.length > 0 || niceToHave.length > 0 ? (
        <Section
          title="What this job asks for"
          description="Extracted from the job description, matched against your resume."
        >
          <div className="space-y-5">
            {[
              { label: "Must have", items: mustHave },
              { label: "Nice to have", items: niceToHave },
            ]
              .filter((group) => group.items.length > 0)
              .map((group) => (
                <div key={group.label}>
                  <h3 className="section-label mb-2">{group.label}</h3>
                  <ul className="space-y-1.5">
                    {group.items.map((item, index) => {
                      const status =
                        gapByRequirement.get(item.requirement.toLowerCase().trim()) ??
                        null;
                      return (
                        <li
                          key={`${item.requirement}-${index}`}
                          className="flex items-start justify-between gap-3 rounded-[var(--radius-control)] bg-canvas px-3 py-2"
                        >
                          <span className="min-w-0 text-body text-ink">
                            {item.requirement}
                          </span>
                          {status ? <StatusChip status={status} /> : null}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
          </div>
        </Section>
      ) : null}

      {/* Gap analysis */}
      {gaps.length > 0 ? (
        <Section
          title="Your gaps"
          description="Requirement by requirement — what you show, what is missing, and what to do."
        >
          <ul className="space-y-3">
            {gaps.map((gap, index) => (
              <li
                key={`${gap.requirement}-${index}`}
                className="rounded-[var(--radius-control)] border border-line p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="text-card-title text-ink">{gap.requirement}</h3>
                  <div className="flex items-center gap-1.5">
                    {gap.unsupported ? <NotEvidencedChip /> : null}
                    <StatusChip status={gap.status} />
                  </div>
                </div>

                {gap.unsupported ? (
                  <p className="mt-2 rounded-[var(--radius-badge)] bg-warning-bg px-2.5 py-1.5 text-label text-ink-secondary">
                    The AI could not point to a specific line on your resume for
                    this. Treat it as a prompt to check, not a finding.
                  </p>
                ) : gap.supportingBulletIds && gap.supportingBulletIds.length > 0 ? (
                  <p className="mt-2 text-label text-ink-muted">
                    Based on{" "}
                    <span className="font-mono">
                      {gap.supportingBulletIds.join(", ")}
                    </span>
                  </p>
                ) : null}

                <dl className="mt-3 space-y-2">
                  <div>
                    <dt className="section-label">On your resume</dt>
                    <dd className="mt-0.5 text-body text-ink-secondary">
                      {gap.current || "Not mentioned."}
                    </dd>
                  </div>
                  {gap.gap ? (
                    <div>
                      <dt className="section-label">Gap</dt>
                      <dd className="mt-0.5 text-body text-ink-secondary">{gap.gap}</dd>
                    </div>
                  ) : null}
                  {gap.recommendation ? (
                    <div>
                      <dt className="section-label">What to do</dt>
                      <dd className="mt-0.5 text-body text-ink">
                        {gap.recommendation}
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {/* Bullet analysis */}
      {bullets.length > 0 ? (
        <Section
          title="Bullet point analysis"
          description="Each bullet scored on clarity, impact, relevance and STAR structure, with a suggested rewrite."
        >
          <ul className="space-y-2">
            {bullets.map((bullet, index) => {
              const isOpen = openBullet === index;
              const average = averageBulletScore(bullet);

              return (
                <li
                  key={index}
                  className="overflow-hidden rounded-[var(--radius-control)] border border-line"
                >
                  <button
                    type="button"
                    onClick={() => setOpenBullet(isOpen ? null : index)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-hover"
                  >
                    <span
                      className={cn(
                        "tabular shrink-0 text-body font-semibold",
                        average === null
                          ? "text-ink-muted"
                          : BAND_TEXT[scoreBand(average)],
                      )}
                    >
                      {average ?? "—"}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-body text-ink-secondary">
                      {bullet.original}
                    </span>
                    <ChevronDown
                      aria-hidden
                      className={cn(
                        "size-4 shrink-0 text-ink-muted transition-transform",
                        isOpen && "rotate-180",
                      )}
                    />
                  </button>

                  {isOpen ? (
                    <div className="border-t border-line bg-canvas px-4 py-4">
                      <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
                        {BULLET_SCORE_LABELS.map(({ field, label }) =>
                          typeof bullet[field] === "number" ? (
                            <ScoreBar key={field} label={label} score={bullet[field]} />
                          ) : null,
                        )}
                      </div>

                      {bullet.issues.length > 0 ? (
                        <ul className="mt-4 flex flex-wrap gap-1.5">
                          {bullet.issues.map((issue) => (
                            <li
                              key={issue}
                              className="rounded-[var(--radius-badge)] border border-warning/20 bg-warning-bg px-2 py-0.5 text-label text-warning"
                            >
                              {issue}
                            </li>
                          ))}
                        </ul>
                      ) : null}

                      <div className="mt-4 space-y-2">
                        <div>
                          <p className="section-label">Original</p>
                          <p className="mt-0.5 text-body text-ink-secondary">
                            {bullet.original}
                          </p>
                        </div>
                        <div>
                          <p className="section-label">Suggested</p>
                          <p className="mt-0.5 rounded-[var(--radius-control)] border border-success/20 bg-success-bg px-3 py-2 text-body text-ink">
                            {bullet.suggested}
                          </p>
                        </div>
                        <p className="text-label text-ink-muted">
                          {bullet.whatChanged}
                        </p>
                      </div>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </Section>
      ) : null}

      {/* Keywords */}
      {analysis.keywordsPresent.length > 0 ||
      analysis.keywordsMissing.length > 0 ||
      analysis.keywordsOverused.length > 0 ? (
        <Section
          title="Keywords"
          description="What the job description asks for, checked against your resume."
        >
          <div className="grid gap-5 sm:grid-cols-3">
            {[
              {
                label: "Present",
                icon: Plus,
                items: analysis.keywordsPresent,
                chip: "border-success/20 bg-success-bg text-success",
              },
              {
                label: "Missing",
                icon: Minus,
                items: analysis.keywordsMissing,
                chip: "border-danger/20 bg-danger-bg text-danger",
              },
              {
                label: "Overused",
                icon: Repeat,
                items: analysis.keywordsOverused,
                chip: "border-warning/20 bg-warning-bg text-warning",
              },
            ].map((column) => (
              <div key={column.label}>
                <h3 className="section-label mb-2 flex items-center gap-1.5">
                  <column.icon aria-hidden className="size-3" />
                  {column.label} ({column.items.length})
                </h3>
                {column.items.length === 0 ? (
                  <p className="text-label text-ink-muted">None</p>
                ) : (
                  <ul className="flex flex-wrap gap-1.5">
                    {column.items.map((keyword) => (
                      <li
                        key={keyword}
                        className={cn(
                          "rounded-[var(--radius-badge)] border px-2 py-0.5 text-label",
                          column.chip,
                        )}
                      >
                        {keyword}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {/* ATS */}
      {analysis.atsScore !== null ? (
        <Section
          title="ATS compatibility"
          description="How well this resume survives automated parsing."
        >
          <div className="flex items-center gap-4">
            <span
              className={cn(
                "tabular text-[32px] leading-none font-bold",
                BAND_TEXT[scoreBand(analysis.atsScore)],
              )}
            >
              {analysis.atsScore}
            </span>
            <span className="text-body text-ink-secondary">
              {atsIssues.length === 0
                ? "No issues found."
                : `${atsIssues.length} ${atsIssues.length === 1 ? "issue" : "issues"} found.`}
            </span>
          </div>

          {atsIssues.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {atsIssues.map((issue, index) => {
                const Icon =
                  issue.level === "error"
                    ? CircleAlert
                    : issue.level === "warning"
                      ? AlertTriangle
                      : Info;
                const tone =
                  issue.level === "error"
                    ? "text-danger"
                    : issue.level === "warning"
                      ? "text-warning"
                      : "text-info";

                return (
                  <li
                    key={index}
                    className="flex gap-2.5 rounded-[var(--radius-control)] border border-line p-3"
                  >
                    <Icon aria-hidden className={cn("mt-0.5 size-4 shrink-0", tone)} />
                    <div className="min-w-0">
                      <p className="text-body font-medium text-ink">{issue.area}</p>
                      <p className="mt-0.5 text-body text-ink-secondary">
                        {issue.message}
                      </p>
                      <p className="mt-1 text-label text-ink-muted">Fix: {issue.fix}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </Section>
      ) : null}

      {/* Recruiter test */}
      {analysis.recruiterVerdict ? (
        <Section
          title="The 10-second recruiter test"
          description="What a recruiter would actually take away from a first glance."
        >
          <div
            className={cn(
              "rounded-[var(--radius-control)] border p-4",
              REQUIREMENT_STYLE[
                analysis.recruiterVerdict === "strong"
                  ? "strong"
                  : analysis.recruiterVerdict === "potential"
                    ? "partial"
                    : "missing"
              ].chip,
            )}
          >
            <p className="text-card-title">
              {analysis.recruiterVerdict === "strong"
                ? "Strong fit"
                : analysis.recruiterVerdict === "potential"
                  ? "Potential fit"
                  : "Weak fit"}
            </p>
            <p className="mt-1 text-body">{analysis.recruiterVerdictReason}</p>
          </div>

          {recruiterAnswers.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {recruiterAnswers.map((answer, index) => (
                <li key={index} className="flex gap-2.5">
                  <span
                    aria-hidden
                    className={cn(
                      "mt-1.5 size-1.5 shrink-0 rounded-full",
                      answer.answerable ? "bg-success" : "bg-danger",
                    )}
                  />
                  <div className="min-w-0">
                    <p className="text-body font-medium text-ink">
                      {answer.question}
                    </p>
                    <p className="mt-0.5 text-body text-ink-secondary">
                      {answer.answer}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </Section>
      ) : null}

      {/* Action plan */}
      {actionPlan.length > 0 ? (
        <Section
          title="Your action plan"
          description="Highest-impact fixes first."
        >
          <ol className="space-y-3">
            {actionPlan.map((action) => (
              <li
                key={action.priority}
                className="rounded-[var(--radius-control)] border border-line p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="flex items-start gap-2 text-card-title text-ink">
                    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-brand-600 text-[11px] font-bold text-white">
                      {action.priority}
                    </span>
                    {action.title}
                  </h3>
                  <span className="rounded-[var(--radius-badge)] bg-surface-hover px-2 py-0.5 text-label text-ink-secondary">
                    {action.effort}
                  </span>
                </div>

                <dl className="mt-3 space-y-2">
                  <div>
                    <dt className="section-label">Problem</dt>
                    <dd className="mt-0.5 text-body text-ink-secondary">
                      {action.problem}
                    </dd>
                  </div>
                  <div>
                    <dt className="section-label">Why it matters</dt>
                    <dd className="mt-0.5 text-body text-ink-secondary">{action.why}</dd>
                  </div>
                  <div>
                    <dt className="section-label">Do this</dt>
                    <dd className="mt-0.5 text-body text-ink">{action.solution}</dd>
                  </div>
                  {action.example ? (
                    <div>
                      <dt className="section-label">Example</dt>
                      <dd className="mt-0.5 rounded-[var(--radius-control)] bg-canvas px-3 py-2 font-mono text-[13px] leading-relaxed text-ink-secondary">
                        {action.example}
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </li>
            ))}
          </ol>
        </Section>
      ) : null}

      {/* Summary rewrite */}
      {analysis.recommendedSummary ? (
        <Section
          title="Your professional summary, tailored"
          description="Rewritten for this job description using only what your resume supports."
        >
          <div className="space-y-3">
            <div>
              <p className="section-label">Current</p>
              <p className="mt-1 rounded-[var(--radius-control)] border border-line bg-canvas px-3 py-2.5 text-body text-ink-secondary">
                {analysis.currentSummary || "Your resume has no summary section."}
              </p>
            </div>
            <div>
              <p className="section-label">Recommended</p>
              <p className="mt-1 rounded-[var(--radius-control)] border border-success/20 bg-success-bg px-3 py-2.5 text-body text-ink">
                {analysis.recommendedSummary}
              </p>
            </div>
            {analysis.summaryWhyBetter ? (
              <div className="flex gap-2 text-body text-ink-secondary">
                <Lightbulb aria-hidden className="mt-0.5 size-4 shrink-0 text-warning" />
                <p>{analysis.summaryWhyBetter}</p>
              </div>
            ) : null}
          </div>
        </Section>
      ) : null}

      {/* Honest note about the guard's limits */}
      <div className="flex gap-2.5 rounded-[var(--radius-card)] border border-line bg-canvas px-4 py-3">
        <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-muted" />
        <p className="text-label text-ink-secondary">
          Suggested rewrites are checked against your resume, and any figure with
          no basis there is replaced with a placeholder like{" "}
          <span className="font-mono">X%</span>. That check is mechanical, not
          perfect — always confirm a number is genuinely yours before using it.
        </p>
      </div>
    </div>
  );
}
