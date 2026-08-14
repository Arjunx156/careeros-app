import "server-only";

import { generateStructured } from "@/lib/ai/gemini";
import { systemInstruction } from "@/lib/ai/prompts";
import { zodToGemini } from "@/lib/ai/zod-to-gemini";
import type { ResumeBullet, ResumeFacts } from "@/lib/analysis/facts";
import {
  optimizedResumeSchema,
  type OptimizedResume,
} from "@/lib/resume/optimized-schema";
import { stripUnverifiable, type FactViolation } from "@/lib/resume/fact-guard";

/**
 * Generate a resume rewritten for one specific job.
 *
 * The model is given the parsed facts — never asked to re-read the raw PDF —
 * and every bullet it writes must cite the source line it came from. Whatever
 * survives generation is then checked against the source, and anything that
 * cannot be traced is stripped before the document is built.
 */

const optimizerSystem = systemInstruction(
  "Rewrite a resume so it targets one specific job, without changing a single " +
    "fact. You are editing language and emphasis, not content. Preserve every " +
    "employer, job title, date and figure exactly as given.",
);

function renderEvidence(items: readonly ResumeBullet[]): string {
  return items.map((item) => `${item.id}: ${item.text}`).join("\n");
}

type GenerateInput = {
  facts: ResumeFacts;
  sourceText: string;
  targetRole: string;
  targetCompany: string;
  /** Requirements the analysis found, so emphasis can shift toward them. */
  mustHave: string[];
  missingKeywords: string[];
  recommendedSummary: string | null;
};

function buildPrompt({
  facts,
  targetRole,
  targetCompany,
  mustHave,
  missingKeywords,
  recommendedSummary,
}: GenerateInput): string {
  const dates = facts.dateRanges.map((range) => range.raw).join(" | ") || "(none found)";

  return `Rewrite this resume for the target role.

TARGET
${targetRole || "(not given)"} at ${targetCompany || "(not given)"}

WHAT THE JOB ASKS FOR
${mustHave.map((item) => `- ${item}`).join("\n") || "(none extracted)"}

TERMS THE RESUME IS MISSING
${missingKeywords.join(", ") || "(none)"}
Only use one of these if the source below genuinely supports it. If it does not,
leave it out — a resume that claims a skill you lack fails at interview.

SUGGESTED SUMMARY FROM THE ANALYSIS
${recommendedSummary ?? "(none — write one from the evidence below)"}

CONTACT DETAILS (copy exactly)
Email: ${facts.contact.email ?? "(none)"}
Phone: ${facts.contact.phone ?? "(none)"}
Links: ${facts.contact.links.join(", ") || "(none)"}

DATE RANGES FOUND (reuse these strings verbatim)
${dates}

DECLARED SKILLS
${facts.declaredSkills.join(", ") || "(none listed)"}

SOURCE LINES — every bullet you write must cite one of these ids
${renderEvidence(facts.evidence)}

RULES
1. Every bullet must set sourceBulletId to the id it was rewritten from.
2. Never introduce a number absent from the source line you are rewriting.
   If a metric would help but none exists, write "X%" or "[number]".
3. Copy employers, job titles, institutions and dates character for character.
4. Do not invent a skill, tool, or employer. Missing stays missing.
4a. Personal, academic and hackathon work belongs in "projects", NOT in
   "experience". Never put a section heading such as "Projects" into the
   company field — a company field must name a real employer.
5. Improve verbs, specificity, ordering and relevance to the target role.
6. Keep each bullet to one line. Lead with the action, not the duty.
7. In changeNotes, briefly say what you changed and why.`;
}

export type GenerationResult = {
  resume: OptimizedResume;
  /** Facts stripped because they could not be traced to the source. */
  removed: FactViolation[];
};

export async function generateOptimizedResume(
  input: GenerateInput,
): Promise<GenerationResult> {
  const raw = await generateStructured({
    tier: "deep",
    systemInstruction: optimizerSystem,
    prompt: buildPrompt(input),
    schema: optimizedResumeSchema,
    responseSchema: zodToGemini(optimizedResumeSchema),
    // Low: this is disciplined editing, not creative writing.
    temperature: 0.25,
  });

  // Schema validity is not fact validity. Strip anything untraceable before it
  // reaches a document that goes out under the user's name.
  const { resume, removed } = stripUnverifiable(raw, input.facts, input.sourceText);

  return { resume, removed };
}
