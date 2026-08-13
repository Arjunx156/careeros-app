import Link from "next/link";
import { FileText, Star } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export type ResumeCardData = {
  id: string;
  name: string;
  targetRole: string | null;
  targetIndustry: string | null;
  isMaster: boolean;
  versionNumber: number;
  fileSizeBytes: number | null;
  skills: string[];
  createdAt: Date;
  analysisCount: number;
  applicationCount: number;
};

export function ResumeCard({ resume }: { resume: ResumeCardData }) {
  const usage = [
    resume.analysisCount > 0
      ? `${resume.analysisCount} ${resume.analysisCount === 1 ? "analysis" : "analyses"}`
      : null,
    resume.applicationCount > 0
      ? `${resume.applicationCount} ${resume.applicationCount === 1 ? "application" : "applications"}`
      : null,
  ].filter(Boolean);

  return (
    <Link
      href={`/resume-library/${resume.id}`}
      className="card card-interactive flex h-full flex-col p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-control)] bg-brand-50 text-brand-600">
          <FileText aria-hidden className="size-4" />
        </div>

        {resume.isMaster ? (
          <span className="inline-flex items-center gap-1 rounded-[var(--radius-badge)] border border-brand-200 bg-brand-50 px-2 py-0.5 text-label font-medium text-brand-700">
            <Star aria-hidden className="size-3" />
            Master
          </span>
        ) : (
          <span className="rounded-[var(--radius-badge)] bg-surface-hover px-2 py-0.5 text-label text-ink-secondary">
            v{resume.versionNumber}
          </span>
        )}
      </div>

      <h2 className="mt-3 text-card-title text-ink">{resume.name}</h2>

      <p className="mt-0.5 text-label text-ink-secondary">
        {resume.targetRole ?? "No target role"}
        {resume.targetIndustry ? ` · ${resume.targetIndustry}` : ""}
      </p>

      {resume.skills.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-1">
          {resume.skills.slice(0, 4).map((skill) => (
            <li
              key={skill}
              className="rounded-[var(--radius-badge)] bg-surface-hover px-1.5 py-0.5 text-label text-ink-secondary"
            >
              {skill}
            </li>
          ))}
          {resume.skills.length > 4 ? (
            <li className="px-1 py-0.5 text-label text-ink-muted">
              +{resume.skills.length - 4}
            </li>
          ) : null}
        </ul>
      ) : null}

      <p className="mt-auto pt-4 text-label text-ink-muted">
        Added {formatDistanceToNow(resume.createdAt, { addSuffix: true })}
        {usage.length > 0 ? ` · ${usage.join(" · ")}` : ""}
      </p>
    </Link>
  );
}
