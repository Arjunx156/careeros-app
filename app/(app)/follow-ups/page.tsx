import { PageHeader } from "@/components/layout/page-header";
import { PhasePlaceholder } from "@/components/ui/phase-placeholder";

export const metadata = { title: "Follow-Ups" };

export default function FollowUpsPage() {
  return (
    <>
      <PageHeader
        title={"Follow-Ups"}
        description={"Nothing slips through the cracks."}
      />
      <PhasePlaceholder
        summary={"One consolidated list of follow-ups across applications and contacts."}
        checkpoint={"Checkpoint 4"}
        features={["Grouped into overdue, due this week, and upcoming","Mark done, snooze three days, or reschedule","Mirrored as a dashboard widget"]}
      />
    </>
  );
}
