import { PageHeader } from "@/components/layout/page-header";
import { PhasePlaceholder } from "@/components/ui/phase-placeholder";

export const metadata = { title: "Resume Library" };

export default function ResumeLibraryPage() {
  return (
    <>
      <PageHeader
        title={"Resume Library"}
        description={"Every version of your resume, in one place."}
      />
      <PhasePlaceholder
        summary={"Upload, name, and manage multiple resume versions with text extracted server-side."}
        checkpoint={"Checkpoint 1"}
        features={["Upload PDFs (10MB max) with a progress indicator","Tag each version with target role, industry, and skills","Mark one version as your Master Resume","Per-resume detail page with PDF preview and usage history"]}
      />
    </>
  );
}
