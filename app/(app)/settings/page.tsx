import { PageHeader } from "@/components/layout/page-header";
import { PhasePlaceholder } from "@/components/ui/phase-placeholder";

export const metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title={"Settings"}
        description={"Configuration and data."}
      />
      <PhasePlaceholder
        summary={"Manage your gate password, AI configuration, and stored data."}
        checkpoint={"Checkpoint 6"}
        features={["Change the app password","Check AI provider connectivity","Export or wipe your data"]}
      />
    </>
  );
}
