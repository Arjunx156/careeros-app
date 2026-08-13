import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, Download, Star } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ResumeActions } from "@/components/resume/resume-actions";
import { prisma } from "@/lib/db/prisma";
import { getOwnerId } from "@/lib/db/user";

export const dynamic = "force-dynamic";

function formatBytes(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function generateMetadata(
  props: PageProps<"/resume-library/[id]">,
) {
  const { id } = await props.params;
  const userId = await getOwnerId();
  const resume = await prisma.resumeVersion.findFirst({
    where: { id, userId },
    select: { name: true },
  });

  return { title: resume?.name ?? "Resume" };
}

export default async function ResumeDetailPage(
  props: PageProps<"/resume-library/[id]">,
) {
  const { id } = await props.params;
  const userId = await getOwnerId();

  const resume = await prisma.resumeVersion.findFirst({
    where: { id, userId },
    include: {
      analyses: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          overallScore: true,
          createdAt: true,
          jobDescription: { select: { company: true, role: true } },
        },
      },
      applications: {
        orderBy: { createdAt: "desc" },
        select: { id: true, company: true, role: true, status: true },
      },
    },
  });

  if (!resume) notFound();

  const usageCount = resume.analyses.length + resume.applications.length;

  const metadata = [
    { label: "Version", value: `v${resume.versionNumber}` },
    { label: "Target role", value: resume.targetRole ?? "—" },
    { label: "Target industry", value: resume.targetIndustry ?? "—" },
    { label: "Experience", value: resume.experienceYears ? `${resume.experienceYears} yrs` : "—" },
    { label: "Education", value: resume.educationLevel ?? "—" },
    { label: "File size", value: formatBytes(resume.fileSizeBytes) },
    { label: "Added", value: format(resume.createdAt, "d MMM yyyy") },
    {
      label: "Extracted text",
      value: resume.extractedText
        ? `${resume.extractedText.length.toLocaleString()} chars`
        : "None",
    },
  ];

  return (
    <>
      <Link
        href="/resume-library"
        className="mb-4 inline-flex items-center gap-1.5 text-label text-ink-secondary transition-colors hover:text-ink"
      >
        <ArrowLeft aria-hidden className="size-3.5" />
        Resume Library
      </Link>

      <PageHeader
        title={resume.name}
        description={
          resume.isMaster
            ? "Your master resume — the analyzer's default."
            : `Version ${resume.versionNumber}`
        }
        actions={
          <>
            <a
              href={resume.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-control)] border border-line bg-surface px-4 text-body font-medium text-ink-secondary transition-colors hover:bg-surface-hover hover:text-ink"
            >
              <Download aria-hidden className="size-4" />
              Open PDF
            </a>
            <ResumeActions
              resumeId={resume.id}
              resumeName={resume.name}
              isMaster={resume.isMaster}
              usageCount={usageCount}
            />
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <section className="card p-5">
            <h2 className="text-section text-ink">Extracted text</h2>
            <p className="mt-0.5 text-label text-ink-muted">
              What the AI reads. If this looks wrong, the analysis will too.
            </p>

            {resume.extractedText ? (
              <pre className="mt-4 max-h-96 overflow-y-auto rounded-[var(--radius-control)] border border-line bg-canvas p-4 font-mono text-[13px] leading-relaxed whitespace-pre-wrap text-ink-secondary">
                {resume.extractedText}
              </pre>
            ) : (
              <p className="mt-4 text-body text-ink-muted">
                No text was extracted from this file.
              </p>
            )}
          </section>

          <section className="card p-5">
            <h2 className="text-section text-ink">Where this version was used</h2>

            {usageCount === 0 ? (
              <p className="mt-3 text-body text-ink-secondary">
                Not used yet. Analyze a job description with this version to see
                how it performs.
              </p>
            ) : (
              <div className="mt-4 space-y-5">
                {resume.analyses.length > 0 ? (
                  <div>
                    <h3 className="section-label mb-2">Analyses</h3>
                    <ul className="divide-y divide-line-subtle">
                      {resume.analyses.map((analysis) => (
                        <li
                          key={analysis.id}
                          className="flex items-center justify-between gap-3 py-2"
                        >
                          <span className="min-w-0 truncate text-body text-ink">
                            {analysis.jobDescription.company} ·{" "}
                            <span className="text-ink-secondary">
                              {analysis.jobDescription.role}
                            </span>
                          </span>
                          <span className="tabular shrink-0 text-body font-medium text-ink">
                            {analysis.overallScore ?? "—"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {resume.applications.length > 0 ? (
                  <div>
                    <h3 className="section-label mb-2">Applications</h3>
                    <ul className="divide-y divide-line-subtle">
                      {resume.applications.map((application) => (
                        <li
                          key={application.id}
                          className="flex items-center justify-between gap-3 py-2"
                        >
                          <span className="min-w-0 truncate text-body text-ink">
                            {application.company} ·{" "}
                            <span className="text-ink-secondary">
                              {application.role}
                            </span>
                          </span>
                          <span className="shrink-0 rounded-[var(--radius-badge)] bg-surface-hover px-2 py-0.5 text-label text-ink-secondary">
                            {application.status.replace(/_/g, " ")}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-5">
          <section className="card p-5">
            <h2 className="text-section text-ink">Details</h2>
            <dl className="mt-3 space-y-2.5">
              {metadata.map((row) => (
                <div key={row.label} className="flex justify-between gap-3">
                  <dt className="text-label text-ink-secondary">{row.label}</dt>
                  <dd className="text-label font-medium text-ink">{row.value}</dd>
                </div>
              ))}
            </dl>

            {resume.isMaster ? (
              <p className="mt-4 inline-flex items-center gap-1.5 rounded-[var(--radius-badge)] border border-brand-200 bg-brand-50 px-2 py-1 text-label font-medium text-brand-700">
                <Star aria-hidden className="size-3" />
                Master Resume
              </p>
            ) : null}
          </section>

          {resume.skills.length > 0 ? (
            <section className="card p-5">
              <h2 className="text-section text-ink">Skills</h2>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {resume.skills.map((skill) => (
                  <li
                    key={skill}
                    className="rounded-[var(--radius-badge)] bg-surface-hover px-2 py-0.5 text-label text-ink-secondary"
                  >
                    {skill}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </aside>
      </div>
    </>
  );
}
