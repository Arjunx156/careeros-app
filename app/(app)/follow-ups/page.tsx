import { PartyPopper } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { FollowUpGroup, type FollowUpRow } from "@/components/follow-ups/follow-up-list";
import { EmptyState } from "@/components/ui/empty-state";
import { getGroupedFollowUps } from "@/lib/follow-ups/query";

export const metadata = { title: "Follow-Ups" };
export const dynamic = "force-dynamic";

export default async function FollowUpsPage() {
  const grouped = await getGroupedFollowUps();

  return (
    <>
      <PageHeader
        title="Follow-Ups"
        description="Everything waiting on you, across applications and contacts."
      />

      {grouped.total === 0 ? (
        <EmptyState
          icon={PartyPopper}
          title="No follow-ups due"
          description="You're on top of it. Follow-ups appear here automatically when you set a date on an application or a contact."
          action={{ label: "View applications", href: "/applications" }}
        />
      ) : (
        <div className="card space-y-6 p-5 sm:p-6">
          <FollowUpGroup group="overdue" items={grouped.overdue as FollowUpRow[]} />
          <FollowUpGroup group="thisWeek" items={grouped.thisWeek as FollowUpRow[]} />
          <FollowUpGroup group="upcoming" items={grouped.upcoming as FollowUpRow[]} />
        </div>
      )}
    </>
  );
}
