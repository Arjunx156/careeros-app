import type { ResumeBullet, ResumeFacts } from "@/lib/analysis/facts";
import type { JdExtraction, Judgment } from "@/lib/ai/schemas";
import type { AtsAnalysis, KeywordAnalysis } from "@/lib/analysis/deterministic";

/**
 * Prompts for the three LLM stages.
 *
 * Each receives the minimum it needs. The resume is never sent whole more than
 * once, and the synthesis stage never sees raw resume text at all — it works
 * from validated outputs, so it cannot rediscover (or reinvent) the facts.
 */

/** Attached to every prompt. Enforcement lives in evidence.ts, not here. */
export const EVIDENCE_RULES = `
EVIDENCE RULES — these are checked mechanically after you answer.

1. Cite your evidence. Every judgment must list the bullet ids it rests on in
   "supportingBulletIds". Use only ids shown to you, exactly as written (b1, b7).
2. An id you invent will be detected and the claim will be discarded. If no
   bullet supports a claim, return an empty list and say so honestly.
3. NEVER introduce a number that does not appear in the evidence you were given.
   No invented percentages, counts, durations, team sizes, or money.
4. When a metric would strengthen a rewrite but none exists, write a placeholder
   such as "X%" or "[team size]". That is the correct answer, not a failure.
5. Never claim a skill, tool, employer, or qualification that is absent from the
   evidence. Missing is missing — say so plainly.
6. Recommendations must be phrased so they are only actionable if genuinely
   true of this person, e.g. "If you led this, say so explicitly".
`.trim();

export function systemInstruction(task: string): string {
  return `You are a precise resume analyst working for one job seeker.

${task}

${EVIDENCE_RULES}

Answer only with JSON matching the provided schema. No prose outside it.`;
}

/** Render bullets as an id-labelled list — the only form the model may cite. */
function renderBullets(bullets: readonly ResumeBullet[]): string {
  if (bullets.length === 0) return "(no bullets found)";
  return bullets.map((b) => `${b.id}: ${b.text}`).join("\n");
}

// ─── Stage 1: JD extraction ──────────────────────────────────────────────────

export const extractPrompt = {
  system: systemInstruction(
    "Read a job description and extract its requirements as structured data. " +
      "Extract only what the JD states — do not infer requirements it does not name.",
  ),
  build: ({ jdText, company, role }: { jdText: string; company: string; role: string }) =>
    `Extract the requirements from this job description.

Company: ${company || "(not given)"}
Role: ${role || "(not given)"}

For "keyTerms", list the concrete skills, tools, and domain terms a recruiter
would scan for — single words or short phrases, no sentences. Whether the resume
contains them is checked separately in code, so do not guess at that.

JOB DESCRIPTION
${jdText}`,
};

// ─── Stage 2: Judgment ───────────────────────────────────────────────────────

export const judgmentPrompt = {
  system: systemInstruction(
    "Judge how well a candidate's resume evidence satisfies a job's requirements. " +
      "You are shown only the resume bullets retrieved as relevant to each " +
      "requirement — judge from that evidence, and say when it is insufficient.",
  ),
  build: ({
    extraction,
    evidenceByRequirement,
    bullets,
    facts,
    keywords,
  }: {
    extraction: JdExtraction;
    evidenceByRequirement: Array<{ requirement: string; bulletIds: string[] }>;
    bullets: readonly ResumeBullet[];
    facts: ResumeFacts;
    keywords: KeywordAnalysis;
  }) => {
    const evidenceLines = evidenceByRequirement
      .map(
        (entry) =>
          `- ${entry.requirement} → evidence: ${
            entry.bulletIds.length > 0 ? entry.bulletIds.join(", ") : "NONE FOUND"
          }`,
      )
      .join("\n");

    return `Judge this candidate against the role.

ROLE
${extraction.role || "(not given)"} at ${extraction.company || "(not given)"}
Seniority: ${extraction.seniority || "(not stated)"}

CANDIDATE PROFILE
Declared skills: ${facts.declaredSkills.join(", ") || "(none listed)"}
Years of experience (computed from dates): ${facts.totalExperienceYears ?? "could not determine"}
Education: ${facts.sections.some((s) => s.kind === "education") ? "present" : "not found"}
Current summary: ${facts.summaryText ?? "(none)"}

RESUME BULLETS — cite these ids and no others
${renderBullets(bullets)}

REQUIREMENTS AND THE EVIDENCE RETRIEVED FOR EACH
${evidenceLines}

ALREADY MEASURED IN CODE (do not recompute, use as context)
Keywords present: ${keywords.present.join(", ") || "(none)"}
Keywords missing: ${keywords.missing.join(", ") || "(none)"}

TASKS
1. For each requirement above, judge status as strong / partial / missing using
   the retrieved evidence AND the candidate profile block.

   "NONE FOUND" means lexical search matched nothing — usually missing, but not
   always. Two cases where it is not:

   - Tenure ("2+ years..."). Search cannot answer this; the computed years of
     experience above can. Judge it from that figure and cite the summary (s1).
   - A skill listed in the skills section but never demonstrated in a bullet.
     That is "partial", cited to k1 — present, but unproven.
2. Score the judgment-based dimensions 0-100. Do not score keywords or ATS —
   those are computed in code.
3. Pick the up to 8 weakest bullets and rewrite each one. Preserve every fact,
   date, employer and figure exactly. Improve verb strength, specificity and
   STAR structure only. Keep each rewrite to one sentence.`;
  },
};

// ─── Stage 3: Synthesis ──────────────────────────────────────────────────────

export const synthesisPrompt = {
  system: systemInstruction(
    "Turn a completed analysis into a recruiter verdict, a prioritized action " +
      "plan, and a tailored professional summary. Work from the findings given " +
      "to you — they are already validated.",
  ),
  build: ({
    extraction,
    judgment,
    ats,
    keywords,
    bullets,
    currentSummary,
    overallScore,
  }: {
    extraction: JdExtraction;
    judgment: Judgment;
    ats: AtsAnalysis;
    keywords: KeywordAnalysis;
    bullets: readonly ResumeBullet[];
    currentSummary: string | null;
    overallScore: number;
  }) => {
    const gaps = judgment.requirements
      .filter((r) => r.status !== "strong")
      .map((r) => `- ${r.requirement} (${r.status}): ${r.gap}`)
      .join("\n");

    const strengths = judgment.requirements
      .filter((r) => r.status === "strong")
      .map((r) => `- ${r.requirement} [${r.supportingBulletIds.join(", ") || "—"}]`)
      .join("\n");

    return `Synthesize the final report.

ROLE: ${extraction.role || "(not given)"} at ${extraction.company || "(not given)"}
OVERALL MATCH: ${overallScore}/100    ATS: ${ats.score}/100

STRENGTHS (evidenced)
${strengths || "(none identified)"}

GAPS
${gaps || "(none identified)"}

MISSING KEYWORDS: ${keywords.missing.join(", ") || "(none)"}
ATS ISSUES: ${ats.issues.map((i) => i.message).join(" | ") || "(none)"}

RESUME BULLETS — cite these ids and no others
${renderBullets(bullets)}

CURRENT SUMMARY
${currentSummary ?? "(none written)"}

TASKS
1. Run the recruiter 10-second test: answer 8 questions about what a recruiter
   sees at a glance, then give a verdict of strong / potential / weak.
2. Write a prioritized action plan, highest impact first. Each item needs the
   problem, why it matters, the exact fix, and a concrete example.
3. Rewrite the professional summary in 3 lines, tailored to this role. Use only
   facts evidenced in the bullets above. Explain why it is better.`;
  },
};

export const prompts = {
  extract: extractPrompt,
  judgment: judgmentPrompt,
  synthesis: synthesisPrompt,
};
