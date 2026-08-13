import { FileText } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { getDashboardSummary } from "@/lib/analytics/summary";

export const metadata = { title: "Dashboard" };

// These counts change as you use the app. Without this the page is prerendered
// at build time and would serve whatever the database held during the build.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const summary = await getDashboardSummary();

  const hasData = summary.totalApplications > 0 || summary.resumeCount > 0;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Where your job search stands right now."
      />

      {hasData ? (
        <div className="space-y-6">
          <section aria-labelledby="volume-heading">
            <h2 id="volume-heading" className="section-label mb-2.5">
              Volume
            </h2>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard
                label="Total Applications"
                value={summary.totalApplications}
                href="/applications"
              />
              <StatCard label="This Week" value={summary.thisWeek} />
              <StatCard label="This Month" value={summary.thisMonth} />
              <StatCard
                label="Awaiting Response"
                value={summary.awaitingResponse}
                hint="Applied, no reply yet"
              />
            </div>
          </section>

          <section aria-labelledby="outcomes-heading">
            <h2 id="outcomes-heading" className="section-label mb-2.5">
              Outcomes
            </h2>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              <StatCard label="Interviews" value={summary.interviews} />
              <StatCard
                label="Offers"
                value={summary.offers}
                emphasis="success"
              />
              <StatCard
                label="Rejections"
                value={summary.rejections}
                emphasis="danger"
              />
            </div>
          </section>

          <section aria-labelledby="conversion-heading">
            <h2 id="conversion-heading" className="section-label mb-2.5">
              Conversion
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatCard
                label="Response Rate"
                value={summary.responseRate}
                suffix="%"
                hint="Any reply, of submitted"
              />
              <StatCard
                label="Interview Rate"
                value={summary.interviewRate}
                suffix="%"
                hint="Reached interview, of submitted"
              />
              <StatCard
                label="Offer Rate"
                value={summary.offerRate}
                suffix="%"
                hint="Offers, of submitted"
              />
            </div>
          </section>

          <section aria-labelledby="library-heading">
            <h2 id="library-heading" className="section-label mb-2.5">
              Library
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatCard
                label="Resume Versions"
                value={summary.resumeCount}
                href="/resume-library"
              />
              <StatCard
                label="JD Analyses"
                value={summary.analysisCount}
                href="/job-analyzer"
              />
              <StatCard
                label="Contacts"
                value={summary.contactCount}
                href="/contacts"
              />
            </div>
          </section>

          <p className="text-label text-ink-muted">
            Charts, the follow-up widget, and the activity feed arrive with the
            analytics phase.
          </p>
        </div>
      ) : (
        <EmptyState
          icon={FileText}
          title="Nothing here yet"
          description="Upload your first resume to get started — then analyze a job description to see your match score."
          action={{ label: "Upload a resume", href: "/resume-library" }}
        />
      )}
    </>
  );
}
