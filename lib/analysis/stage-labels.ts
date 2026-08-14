/**
 * Pipeline stages and their progress labels.
 *
 * Separate from the pipeline itself because that module is server-only (it
 * pulls in the Gemini client) while the progress UI is a client component.
 * Order here is order of execution.
 *
 * Only three stages call the AI. The "measure" stage is pure computation and
 * returns instantly — it is listed so the user sees what the app is doing, not
 * because it costs anything.
 */
export const STAGE_DEFINITIONS = [
  { key: "extract", label: "Reading the job description", usesAi: true },
  { key: "measure", label: "Measuring your resume", usesAi: false },
  { key: "judgment", label: "Judging your evidence", usesAi: true },
  { key: "synthesis", label: "Writing your action plan", usesAi: true },
] as const;

export type StageKey = (typeof STAGE_DEFINITIONS)[number]["key"];

export const STAGE_LABELS_CLIENT: string[] = STAGE_DEFINITIONS.map((s) => s.label);
export const TOTAL_STAGES_CLIENT = STAGE_DEFINITIONS.length;

/** How many stages actually spend an API request — used for quota messaging. */
export const AI_STAGE_COUNT = STAGE_DEFINITIONS.filter((s) => s.usesAi).length;
