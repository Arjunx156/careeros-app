import { PageHeader } from "@/components/layout/page-header";
import { PhasePlaceholder } from "@/components/ui/phase-placeholder";

export const metadata = { title: "Jobs" };

export default function JobsPage() {
  return (
    <>
      <PageHeader
        title={"Jobs"}
        description={"Every job you have saved."}
      />
      <PhasePlaceholder
        summary={"A central database of saved job descriptions with rich filtering."}
        checkpoint={"Checkpoint 4"}
        features={["Filter by country, role, industry, match score, status, and deadline","Full job record with the original JD text","Links through to the application once you apply"]}
      />
    </>
  );
}
