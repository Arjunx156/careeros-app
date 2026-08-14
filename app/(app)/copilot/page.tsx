import { PageHeader } from "@/components/layout/page-header";
import { CopilotChat } from "@/components/copilot/copilot-chat";
import { SUGGESTED_PROMPTS } from "@/lib/copilot/context";

export const metadata = { title: "Career Copilot" };

export default function CopilotPage() {
  return (
    <>
      <PageHeader
        title="Career Copilot"
        description="Answers from your own data — not generic career advice."
      />
      <CopilotChat suggestions={[...SUGGESTED_PROMPTS]} />
    </>
  );
}
