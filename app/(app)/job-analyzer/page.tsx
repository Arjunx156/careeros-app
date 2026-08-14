import Link from "next/link";
import { format } from "date-fns";
import { KeyRound } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { AnalyzerForm } from "@/components/analyzer/analyzer-form";
import { isAiConfigured } from "@/lib/ai/gemini";
import { STAGE_LABELS_CLIENT } from "@/lib/analysis/stage-labels";
import { prisma } from "@/lib/db/prisma";
import { getOwnerId } from "@/lib/db/user";
import { BAND_TEXT, scoreBand } from "@/lib/score";
import { cn } from "@/lib/utils";

export const metadata = { title: "Job Analyzer" };
export const dynamic = "force-dynamic";

export default async function JobAnalyzerPage() {
  const userId = await getOwnerId();

  const [resumes, analyses] = await Promise.all([
    prisma.resumeVersion.findMany({
      where: { userId },
      orderBy: [{ isMaster: "desc" }, { createdAt: "desc" }],
      select: { id: true, name: true, isMaster: true, extractedText: true },
    }),
    prisma.analysis.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        status: true,
        overallScore: true,
        createdAt: true,
        resumeVersion: { select: { name: true } },
        jobDescription: { select: { company: true, role: true } },
      },
    }),
  ]);

  const resumeOptions = resumes.map((resume) => ({
    id: resume.id,
    name: resume.name,
    isMaster: resume.isMaster,
    hasText: (resume.extractedText?.trim().length ?? 0) >= 100,
  }));

  return (
    <>
      <PageHeader
        title="Job Analyzer"
        description="Score your resume against a job description, and find out exactly what to fix."
      />

      {!isAiConfigured() ? (
        <div className="mb-5 flex items-start gap-2.5 rounded-[var(--radius-card)] border border-warning/20 bg-warning-bg px-4 py-3">
          <KeyRound aria-hidden className="mt-0.5 size-4 shrink-0 text-warning" />
          <p className="text-body text-ink-secondary">
            <span className="font-medium text-ink">No AI key configured.</span> Add{" "}
            <code className="font-mono text-[13px]">
              GOOGLE_GENERATIVE_AI_API_KEY
            </code>{" "}
            to <code className="font-mono text-[13px]">.env.local</code> — get one
            free at{" "}
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-brand-600 underline"
            >
              Google AI Studio
            </a>
            .
          </p>
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <AnalyzerForm resumes={resumeOptions} stageLabels={[...STAGE_LABELS_CLIENT]} />

        <aside className="card h-fit p-5">
          <h2 className="text-section text-ink">Recent analyses</h2>

          {analyses.length === 0 ? (
            <p className="mt-3 text-body text-ink-secondary">
              Nothing analyzed yet. Your history appears here.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-line-subtle">
              {analyses.map((analysis) => (
                <li key={analysis.id}>
                  <Link
                    href={`/job-analyzer/${analysis.id}`}
                    className="flex items-center gap-3 py-2.5 transition-colors hover:text-brand-700"
                  >
                    <span
                      className={cn(
                        "tabular w-8 shrink-0 text-body font-semibold",
                        analysis.overallScore === null
                          ? "text-ink-muted"
                          : BAND_TEXT[scoreBand(analysis.overallScore)],
                      )}
                    >
                      {analysis.overallScore ?? "—"}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-body text-ink">
                        {analysis.jobDescription.company}
                      </span>
                      <span className="block truncate text-label text-ink-muted">
                        {analysis.jobDescription.role} ·{" "}
                        {format(analysis.createdAt, "d MMM")}
                      </span>
                    </span>
                    {analysis.status !== "complete" ? (
                      <span className="shrink-0 rounded-[var(--radius-badge)] bg-warning-bg px-1.5 py-0.5 text-label text-warning">
                        {analysis.status}
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </>
  );
}
