import { PageHeader } from "@/components/layout/page-header";
import { PhasePlaceholder } from "@/components/ui/phase-placeholder";

export const metadata = { title: "Contacts" };

export default function ContactsPage() {
  return (
    <>
      <PageHeader
        title={"Contacts"}
        description={"Your networking CRM."}
      />
      <PhasePlaceholder
        summary={"Everyone you have contacted, and where each relationship stands."}
        checkpoint={"Checkpoint 5"}
        features={["Nine relationship stages from not-contacted through referral received","Message history per contact","AI-generated cold messages in five formats","Follow-up reminders tied to each contact"]}
      />
    </>
  );
}
