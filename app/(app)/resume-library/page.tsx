import { FileText, HardDrive } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ResumeCard } from "@/components/resume/resume-card";
import { UploadResumeDialog } from "@/components/resume/upload-resume-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { prisma } from "@/lib/db/prisma";
import { getOwnerId } from "@/lib/db/user";
import { isLocalStorage } from "@/lib/storage";

export const metadata = { title: "Resume Library" };
export const dynamic = "force-dynamic";

export default async function ResumeLibraryPage() {
  const userId = await getOwnerId();

  const resumes = await prisma.resumeVersion.findMany({
    where: { userId },
    orderBy: [{ isMaster: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      targetRole: true,
      targetIndustry: true,
      isMaster: true,
      versionNumber: true,
      fileSizeBytes: true,
      skills: true,
      createdAt: true,
      _count: { select: { analyses: true, applications: true } },
    },
  });

  return (
    <>
      <PageHeader
        title="Resume Library"
        description="Every version of your resume, in one place."
        actions={<UploadResumeDialog isFirst={resumes.length === 0} />}
      />

      {isLocalStorage() ? (
        <div className="mb-5 flex items-start gap-2.5 rounded-[var(--radius-card)] border border-warning/20 bg-warning-bg px-4 py-3">
          <HardDrive aria-hidden className="mt-0.5 size-4 shrink-0 text-warning" />
          <p className="text-body text-ink-secondary">
            <span className="font-medium text-ink">Files are stored on this machine.</span>{" "}
            Add <code className="font-mono text-[13px]">BLOB_READ_WRITE_TOKEN</code> to
            switch to Vercel Blob — required before deploying, since Vercel&apos;s
            filesystem is read-only.
          </p>
        </div>
      ) : null}

      {resumes.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No resumes yet"
          description="Upload your master resume to begin. Text is extracted automatically so the analyzer can read it."
          action={{ label: "Go to Job Analyzer", href: "/job-analyzer" }}
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {resumes.map((resume) => (
            <li key={resume.id}>
              <ResumeCard
                resume={{
                  ...resume,
                  analysisCount: resume._count.analyses,
                  applicationCount: resume._count.applications,
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
