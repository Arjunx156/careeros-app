import { PageHeader } from "@/components/layout/page-header";
import { PhasePlaceholder } from "@/components/ui/phase-placeholder";

export const metadata = { title: "Applications" };

export default function ApplicationsPage() {
  return (
    <>
      <PageHeader
        title={"Applications"}
        description={"Track every application through the pipeline."}
      />
      <PhasePlaceholder
        summary={"A CRM for your job search, as a kanban board and a filterable table."}
        checkpoint={"Checkpoint 4"}
        features={["Nine-column kanban with drag-and-drop status changes","Table view with sorting and filters","Detail page: overview, analysis, interviews, messages, timeline","Every status change recorded to an audit timeline"]}
      />
    </>
  );
}
