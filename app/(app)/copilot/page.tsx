import { PageHeader } from "@/components/layout/page-header";
import { PhasePlaceholder } from "@/components/ui/phase-placeholder";

export const metadata = { title: "Career Copilot" };

export default function CopilotPage() {
  return (
    <>
      <PageHeader
        title={"Career Copilot"}
        description={"Ask questions about your own job search."}
      />
      <PhasePlaceholder
        summary={"A chat assistant grounded in your real resumes, applications, and scores."}
        checkpoint={"Checkpoint 5"}
        features={["Answers cite your actual data, not generic advice","Streaming responses","Suggested prompts to get started"]}
      />
    </>
  );
}
