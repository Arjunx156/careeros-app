import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { AlertTriangle, ArrowLeft, ExternalLink, FileText } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { AddToApplications } from "@/components/analyzer/add-to-applications";
import { AnalysisResults } from "@/components/analyzer/analysis-results";
import { OptimizePanel } from "@/components/resume/optimize-panel";
import { ResumeAnalysisResume } from "@/components/analyzer/analysis-resume-button";
import { TOTAL_STAGES } from "@/lib/ai/pipeline";
import { toAnalysisRecord } from "@/lib/analysis/types";
import { prisma } from "@/lib/db/prisma";
import { getOwnerId } from "@/lib/db/user";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: PageProps<"/job-analyzer/[id]">) {
  const { id } = await props.params;
  const userId = await getOwnerId();
  const analysis = await prisma.analysis.findFirst({
    where: { id, userId },
    select: { jobDescription: { select: { company: true, role: true } } },
  });

  return {
    title: analysis
      ? `${analysis.jobDescription.company} — ${analysis.jobDescription.role}`
      : "Analysis",
  };
}

export default async function AnalysisPage(props: PageProps<"/job-analyzer/[id]">) {
  const { id } = await props.params;
  const userId = await getOwnerId();

  const analysis = await prisma.analysis.findFirst({
    where: { id, userId },
    include: {
      resumeVersion: { select: { id: true, name: true } },
      jobDescription: {
        select: { id: true, company: true, role: true, jobUrl: true },
      },
    },
  });

  if (!analysis) notFound();

  const optimized = await prisma.optimizedResume.findMany({
    where: { userId, analysisId: analysis.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, pdfUrl: true, docxUrl: true },
  });

  // Matched on the job as well as this analysis: re-analysing a job produces a
  // second analysis, and that should still count as already being tracked
  // rather than inviting a duplicate application.
  const existingApplication = await prisma.application.findFirst({
    where: {
      userId,
      OR: [
        { analysisId: analysis.id },
        { jobDescriptionId: analysis.jobDescriptionId },
      ],
    },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  const record = toAnalysisRecord(analysis);
  const isIncomplete = analysis.status !== "complete";

  return (
    <>
      <Link
        href="/job-analyzer"
        className="mb-4 inline-flex items-center gap-1.5 text-label text-ink-secondary transition-colors hover:text-ink"
      >
        <ArrowLeft aria-hidden className="size-3.5" />
        Job Analyzer
      </Link>

      <PageHeader
        title={analysis.jobDescription.company}
        description={`${analysis.jobDescription.role} · analyzed ${format(analysis.createdAt, "d MMM yyyy")}`}
        actions={
          <>
            <AddToApplications
              analysisId={analysis.id}
              jobDescriptionId={analysis.jobDescriptionId}
              company={analysis.jobDescription.company}
              role={analysis.jobDescription.role}
              matchScore={analysis.overallScore}
              resumeVersionId={analysis.resumeVersion.id}
              resumeName={analysis.resumeVersion.name}
              existingApplicationId={existingApplication?.id ?? null}
            />
            {analysis.jobDescription.jobUrl ? (
              <a
                href={analysis.jobDescription.jobUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-control)] border border-line bg-surface px-4 text-body font-medium text-ink-secondary transition-colors hover:bg-surface-hover hover:text-ink"
              >
                <ExternalLink aria-hidden className="size-4" />
                Job posting
              </a>
            ) : null}
            <Link
              href={`/resume-library/${analysis.resumeVersion.id}`}
              className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-control)] border border-line bg-surface px-4 text-body font-medium text-ink-secondary transition-colors hover:bg-surface-hover hover:text-ink"
            >
              <FileText aria-hidden className="size-4" />
              {analysis.resumeVersion.name}
            </Link>
          </>
        }
      />

      {isIncomplete ? (
        <div className="mb-5 flex items-start gap-2.5 rounded-[var(--radius-card)] border border-warning/20 bg-warning-bg px-4 py-3">
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0 text-warning" />
          <div className="min-w-0">
            <p className="text-body text-ink">
              <span className="font-medium">
                This analysis is {analysis.stage} of {TOTAL_STAGES} steps complete.
              </span>{" "}
              Everything below is saved; the remaining sections are missing.
            </p>
            {analysis.stageError ? (
              <p className="mt-1 text-label text-ink-secondary">
                Last error: {analysis.stageError}
              </p>
            ) : null}
            <div className="mt-2">
              <ResumeAnalysisResume
                analysisId={analysis.id}
                fromStage={analysis.stage}
              />
            </div>
          </div>
        </div>
      ) : null}

      <AnalysisResults analysis={record} />

      <div className="mt-5">
        <OptimizePanel
          analysisId={analysis.id}
          isComplete={analysis.status === "complete"}
          existing={optimized.map((item) => ({
            id: item.id,
            name: item.name,
            pdfUrl: item.pdfUrl,
            docxUrl: item.docxUrl,
          }))}
        />
      </div>
    </>
  );
}
