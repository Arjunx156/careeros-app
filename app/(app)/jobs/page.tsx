import Link from "next/link";
import { Briefcase } from "lucide-react";
import { format } from "date-fns";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { JobsTable, type JobRow } from "@/components/jobs/jobs-table";
import { prisma } from "@/lib/db/prisma";
import { getOwnerId } from "@/lib/db/user";

export const metadata = { title: "Jobs" };
export const dynamic = "force-dynamic";

export default async function JobsPage() {
  const userId = await getOwnerId();

  const jobs = await prisma.jobDescription.findMany({
    where: { userId },
    orderBy: { dateFound: "desc" },
    select: {
      id: true,
      company: true,
      role: true,
      location: true,
      country: true,
      workType: true,
      industry: true,
      roleCategory: true,
      salaryMin: true,
      salaryMax: true,
      salaryCurrency: true,
      deadline: true,
      dateFound: true,
      jobUrl: true,
      analyses: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, overallScore: true },
      },
      applications: {
        take: 1,
        select: { id: true, status: true },
      },
    },
  });

  const rows: JobRow[] = jobs.map((job) => ({
    id: job.id,
    company: job.company,
    role: job.role,
    location: job.location,
    country: job.country,
    workType: job.workType,
    industry: job.industry,
    roleCategory: job.roleCategory,
    deadline: job.deadline ? format(job.deadline, "yyyy-MM-dd") : null,
    dateFound: format(job.dateFound, "yyyy-MM-dd"),
    jobUrl: job.jobUrl,
    matchScore: job.analyses[0]?.overallScore ?? null,
    analysisId: job.analyses[0]?.id ?? null,
    applicationId: job.applications[0]?.id ?? null,
    applicationStatus: job.applications[0]?.status ?? null,
  }));

  return (
    <>
      <PageHeader
        title="Jobs"
        description="Every job description you have saved or analyzed."
        actions={
          <Link
            href="/job-analyzer"
            className="inline-flex h-10 items-center rounded-[var(--radius-control)] bg-brand-600 px-4 text-body font-medium text-white transition-colors hover:bg-brand-700"
          >
            Analyze a job
          </Link>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No jobs saved yet"
          description="Jobs are saved automatically when you analyze a description. Everything you have looked at collects here."
          action={{ label: "Open Job Analyzer", href: "/job-analyzer" }}
        />
      ) : (
        <JobsTable jobs={rows} />
      )}
    </>
  );
}
