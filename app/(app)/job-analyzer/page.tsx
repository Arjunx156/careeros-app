import { PageHeader } from "@/components/layout/page-header";
import { PhasePlaceholder } from "@/components/ui/phase-placeholder";

export const metadata = { title: "Job Analyzer" };

export default function JobAnalyzerPage() {
  return (
    <>
      <PageHeader
        title={"Job Analyzer"}
        description={"Score your resume against any job description."}
      />
      <PhasePlaceholder
        summary={"The core workflow: pick a resume, paste a JD, and get a full analysis."}
        checkpoint={"Checkpoint 2"}
        features={["Overall match score plus 10 sub-scores","JD requirement extraction with strong / partial / missing indicators","Bullet-by-bullet scoring with STAR and quantification feedback","Keyword, ATS, and recruiter 10-second test results","Prioritized action plan and a JD-specific summary rewrite"]}
      />
    </>
  );
}
