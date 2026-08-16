"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, Search } from "lucide-react";
import { DeleteJobButton } from "@/components/jobs/delete-job-button";
import { Select } from "@/components/ui/field";
import { STATUS_CONFIG } from "@/lib/applications/status";
import { BAND_TEXT, scoreBand } from "@/lib/score";
import { cn } from "@/lib/utils";
import type { ApplicationStatus, WorkType } from "@/lib/generated/prisma/enums";

export type JobRow = {
  id: string;
  company: string;
  role: string;
  location: string | null;
  country: string | null;
  workType: WorkType | null;
  industry: string | null;
  roleCategory: string | null;
  deadline: string | null;
  dateFound: string;
  jobUrl: string | null;
  matchScore: number | null;
  analysisId: string | null;
  applicationId: string | null;
  applicationStatus: ApplicationStatus | null;
  /** Totals, not just the one row rendered above — the delete confirmation
   *  has to state everything the cascade will take. */
  analysisCount: number;
  applicationCount: number;
};

/** Distinct non-null values for a filter dropdown, sorted. */
function options(jobs: JobRow[], key: keyof JobRow): string[] {
  const values = new Set<string>();
  for (const job of jobs) {
    const value = job[key];
    if (typeof value === "string" && value.trim().length > 0) values.add(value);
  }
  return [...values].sort((a, b) => a.localeCompare(b));
}

const MIN_SCORES = [0, 60, 70, 80, 90] as const;

export function JobsTable({ jobs }: { jobs: JobRow[] }) {
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("");
  const [roleCategory, setRoleCategory] = useState("");
  const [industry, setIndustry] = useState("");
  const [minScore, setMinScore] = useState(0);
  const [applied, setApplied] = useState<"all" | "yes" | "no">("all");

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();

    return jobs.filter((job) => {
      if (term && !`${job.company} ${job.role}`.toLowerCase().includes(term)) return false;
      if (country && job.country !== country) return false;
      if (roleCategory && job.roleCategory !== roleCategory) return false;
      if (industry && job.industry !== industry) return false;
      if (minScore > 0 && (job.matchScore ?? -1) < minScore) return false;
      if (applied === "yes" && !job.applicationId) return false;
      if (applied === "no" && job.applicationId) return false;
      return true;
    });
  }, [jobs, query, country, roleCategory, industry, minScore, applied]);

  const countries = options(jobs, "country");
  const roles = options(jobs, "roleCategory");
  const industries = options(jobs, "industry");

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-end gap-3 p-4">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search company or role"
            aria-label="Search jobs"
            className="h-9 w-full rounded-[var(--radius-control)] border border-line bg-surface pr-3 pl-9 text-body text-ink placeholder:text-ink-muted focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none"
          />
        </div>

        {countries.length > 1 ? (
          <label className="text-label text-ink-secondary">
            Country
            <Select
              value={country}
              onChange={(event) => setCountry(event.target.value)}
              className="mt-1 h-9 w-36"
            >
              <option value="">All</option>
              {countries.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          </label>
        ) : null}

        {roles.length > 1 ? (
          <label className="text-label text-ink-secondary">
            Role
            <Select
              value={roleCategory}
              onChange={(event) => setRoleCategory(event.target.value)}
              className="mt-1 h-9 w-40"
            >
              <option value="">All</option>
              {roles.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          </label>
        ) : null}

        {industries.length > 1 ? (
          <label className="text-label text-ink-secondary">
            Industry
            <Select
              value={industry}
              onChange={(event) => setIndustry(event.target.value)}
              className="mt-1 h-9 w-36"
            >
              <option value="">All</option>
              {industries.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          </label>
        ) : null}

        <label className="text-label text-ink-secondary">
          Min match
          <Select
            value={String(minScore)}
            onChange={(event) => setMinScore(Number(event.target.value))}
            className="mt-1 h-9 w-28"
          >
            {MIN_SCORES.map((score) => (
              <option key={score} value={score}>
                {score === 0 ? "Any" : `${score}+`}
              </option>
            ))}
          </Select>
        </label>

        <label className="text-label text-ink-secondary">
          Applied
          <Select
            value={applied}
            onChange={(event) => setApplied(event.target.value as typeof applied)}
            className="mt-1 h-9 w-28"
          >
            <option value="all">All</option>
            <option value="yes">Applied</option>
            <option value="no">Not applied</option>
          </Select>
        </label>

        <p className="tabular ml-auto text-label text-ink-muted">
          {filtered.length} of {jobs.length}
        </p>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[840px] text-left">
          <thead>
            <tr className="border-b border-line">
              {["Company", "Role", "Location", "Match", "Status", "Found", ""].map(
                (head, index) => (
                  <th
                    key={head || index}
                    scope="col"
                    className="px-4 py-2.5 text-label font-medium text-ink-secondary"
                  >
                    {head}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.map((job) => (
              <tr
                key={job.id}
                className="border-b border-line-subtle transition-colors last:border-0 hover:bg-surface-hover"
              >
                <td className="px-4 py-2.5 text-body font-medium text-ink">
                  {job.company}
                </td>
                <td className="px-4 py-2.5 text-body text-ink-secondary">{job.role}</td>
                <td className="px-4 py-2.5 text-label text-ink-secondary">
                  {[job.location, job.country].filter(Boolean).join(", ") || "—"}
                </td>
                <td className="px-4 py-2.5">
                  {job.matchScore !== null && job.analysisId ? (
                    <Link
                      href={`/job-analyzer/${job.analysisId}`}
                      className={cn(
                        "tabular text-body font-semibold hover:underline",
                        BAND_TEXT[scoreBand(job.matchScore)],
                      )}
                    >
                      {job.matchScore}
                    </Link>
                  ) : (
                    <span className="text-ink-muted">—</span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  {job.applicationStatus && job.applicationId ? (
                    <Link
                      href={`/applications/${job.applicationId}`}
                      className={cn(
                        "inline-flex items-center rounded-[var(--radius-badge)] border px-2 py-0.5 text-label font-medium",
                        STATUS_CONFIG[job.applicationStatus].badge,
                      )}
                    >
                      {STATUS_CONFIG[job.applicationStatus].label}
                    </Link>
                  ) : (
                    <span className="text-label text-ink-muted">Not applied</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-label text-ink-secondary">
                  {job.dateFound}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center justify-end gap-1">
                    {job.jobUrl ? (
                      <a
                        href={job.jobUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Open the ${job.company} posting`}
                        className="grid size-7 place-items-center rounded-[var(--radius-badge)] text-ink-muted hover:bg-surface-hover hover:text-ink"
                      >
                        <ExternalLink aria-hidden className="size-3.5" />
                      </a>
                    ) : null}
                    <DeleteJobButton
                      jobId={job.id}
                      company={job.company}
                      role={job.role}
                      analysisCount={job.analysisCount}
                      applicationCount={job.applicationCount}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 ? (
          <p className="px-4 py-10 text-center text-body text-ink-secondary">
            No jobs match those filters.
          </p>
        ) : null}
      </div>
    </div>
  );
}
