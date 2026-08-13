/**
 * Pipeline stage keys and their progress labels.
 *
 * Lives apart from lib/ai/pipeline.ts because that module is server-only (it
 * pulls in the Gemini client), while the progress UI is a client component.
 * The pipeline imports these, so the order here is the order of execution.
 */
export const STAGE_DEFINITIONS = [
  { key: "extract", label: "Extracting JD requirements" },
  { key: "score", label: "Scoring resume against the JD" },
  { key: "gaps", label: "Analyzing gaps" },
  { key: "bullets", label: "Scoring bullet points" },
  { key: "keywords", label: "Comparing keywords" },
  { key: "ats", label: "Checking ATS compatibility" },
  { key: "recruiter", label: "Running the 10-second recruiter test" },
  { key: "actionPlan", label: "Building your action plan" },
  { key: "summary", label: "Writing your tailored summary" },
] as const;

export type StageKey = (typeof STAGE_DEFINITIONS)[number]["key"];

export const STAGE_LABELS_CLIENT: string[] = STAGE_DEFINITIONS.map(
  (stage) => stage.label,
);

export const TOTAL_STAGES_CLIENT = STAGE_DEFINITIONS.length;
