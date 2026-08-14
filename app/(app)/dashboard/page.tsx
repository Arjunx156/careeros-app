import { FileText } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { getDashboardSummary } from "@/lib/analytics/summary";
import { getGroupedFollowUps } from "@/lib/follow-ups/query";
import { FollowUpGroup, type FollowUpRow } from "@/components/follow-ups/follow-up-list";
import Link from "next/link";

export const metadata = { title: "Dashboard" };

// These counts change as you use the app. Without this the page is prerendered
// at build time and would serve whatever the database held during the build.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [summary, followUps] = await Promise.all([
    getDashboardSummary(),
    getGroupedFollowUps(8),
  ]);

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

          {followUps.total > 0 ? (
            <section className="card p-5" aria-labelledby="followups-heading">
              <div className="flex items-center justify-between gap-3">
                <h2 id="followups-heading" className="text-section text-ink">
                  Follow-ups
                </h2>
                <Link
                  href="/follow-ups"
                  className="text-label font-medium text-brand-600 hover:underline"
                >
                  View all
                </Link>
              </div>

              <div className="mt-4 space-y-5">
                <FollowUpGroup
                  group="overdue"
                  items={followUps.overdue as FollowUpRow[]}
                  compact
                />
                <FollowUpGroup
                  group="thisWeek"
                  items={followUps.thisWeek as FollowUpRow[]}
                  compact
                />
                <FollowUpGroup
                  group="upcoming"
                  items={followUps.upcoming as FollowUpRow[]}
                  compact
                />
              </div>
            </section>
          ) : null}

          <p className="text-label text-ink-muted">
            Charts and the activity feed arrive with the analytics phase.
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
