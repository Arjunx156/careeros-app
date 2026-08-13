import { PageHeader } from "@/components/layout/page-header";
import { PhasePlaceholder } from "@/components/ui/phase-placeholder";

export const metadata = { title: "Analytics" };

export default function AnalyticsPage() {
  return (
    <>
      <PageHeader
        title={"Analytics"}
        description={"What is actually working in your search."}
      />
      <PhasePlaceholder
        summary={"Which resume, role, location, and method generate real interviews."}
        checkpoint={"Checkpoint 5"}
        features={["Interview rate per resume version","Performance by role type and by location","Referral vs direct vs LinkedIn comparison","Applications over time"]}
      />
    </>
  );
}
