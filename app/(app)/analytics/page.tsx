import { BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { SegmentChart, TimeChart } from "@/components/analytics/performance-charts";
import { prisma } from "@/lib/db/prisma";
import { getOwnerId } from "@/lib/db/user";
import {
  MIN_SEGMENT_SIZE,
  aggregateBy,
  applicationsOverTime,
  hasEnoughData,
  type PerformanceRow,
} from "@/lib/analytics/performance";

export const metadata = { title: "Analytics" };
export const dynamic = "force-dynamic";

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="text-section text-ink">{title}</h2>
      <p className="mt-0.5 text-body text-ink-secondary">{description}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default async function AnalyticsPage() {
  const userId = await getOwnerId();

  const applications = await prisma.application.findMany({
    where: { userId },
    select: {
      status: true,
      applicationDate: true,
      createdAt: true,
      country: true,
      applicationMethod: true,
      resumeVersion: { select: { name: true } },
      jobDescription: { select: { roleCategory: true } },
    },
  });

  const rows: PerformanceRow[] = applications.map((application) => ({
    status: application.status,
    resumeName: application.resumeVersion?.name ?? null,
    roleCategory: application.jobDescription?.roleCategory ?? null,
    country: application.country,
    method: application.applicationMethod,
  }));

  if (!hasEnoughData(rows)) {
    return (
      <>
        <PageHeader
          title="Analytics"
          description="What is actually working in your search."
        />
        <EmptyState
          icon={BarChart3}
          title="Not enough data yet"
          description="Track at least 5 submitted applications and these numbers start meaning something. Before that, a percentage is noise dressed up as insight."
          action={{ label: "Go to applications", href: "/applications" }}
        />
      </>
    );
  }

  const timePoints = applicationsOverTime(
    applications.map((application) => ({
      date: application.applicationDate ?? application.createdAt,
      status: application.status,
    })),
  );

  return (
    <>
      <PageHeader
        title="Analytics"
        description="What is actually working in your search."
      />

      <div className="space-y-5">
        <Section
          title="Applications over time"
          description="Volume and how many reached an interview."
        >
          <TimeChart data={timePoints} />
        </Section>

        <Section
          title="Resume performance"
          description={`Interview rate per version. Segments under ${MIN_SEGMENT_SIZE} applications are shown grey — too few to read anything into.`}
        >
          <SegmentChart data={aggregateBy(rows, (row) => row.resumeName, "No resume linked")} />
        </Section>

        <Section
          title="Role performance"
          description="Which kinds of role are actually converting."
        >
          <SegmentChart data={aggregateBy(rows, (row) => row.roleCategory, "Uncategorized")} />
        </Section>

        <Section
          title="Location performance"
          description="Interview rate by country."
        >
          <SegmentChart data={aggregateBy(rows, (row) => row.country, "No country")} />
        </Section>

        <Section
          title="Application method"
          description="Referral versus direct versus job board — usually the biggest single lever."
        >
          <SegmentChart data={aggregateBy(rows, (row) => row.method, "Not recorded")} />
        </Section>
      </div>
    </>
  );
}
