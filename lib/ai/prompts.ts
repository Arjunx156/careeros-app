/**
 * Prompt templates for the analysis pipeline.
 *
 * Every prompt that can produce resume content carries NEVER_FABRICATE. That
 * instruction is necessary but not sufficient — lib/ai/fabrication-guard.ts
 * mechanically verifies the output afterwards.
 */

/** The non-negotiable contract, from docs/06_Implementation_Plan.md. */
export const NEVER_FABRICATE = `
CRITICAL RULES — these override every other instruction:
- NEVER fabricate experience, skills, metrics, or achievements.
- NEVER invent numbers, percentages, dates, company names, or job titles.
- Only reference things the resume actually contains.
- When a metric would strengthen a bullet but the resume does not provide one,
  write a placeholder such as "X%" or "[number]" and say what kind of metric
  belongs there. Do NOT guess a plausible figure.
- When recommending the candidate add something, phrase it conditionally:
  "Only add this if you genuinely have this experience."
- If the resume does not support a claim, say so plainly. An honest gap is more
  useful than an invented strength.
`.trim();

const BASE_ROLE = `
You are a senior technical recruiter and resume strategist. You have screened
thousands of resumes and know exactly what makes one pass or fail an ATS and a
10-second human scan. You are direct and specific. You never pad your answers
with generic advice.
`.trim();

export function systemInstruction(task: string): string {
  return `${BASE_ROLE}\n\nYour current task: ${task}\n\n${NEVER_FABRICATE}`;
}

type AnalysisContext = {
  resumeText: string;
  jdText: string;
  company?: string;
  role?: string;
};

function contextBlock({ resumeText, jdText }: AnalysisContext): string {
  return `
=== JOB DESCRIPTION ===
${jdText}

=== CANDIDATE RESUME ===
${resumeText}
`.trim();
}

// ─── Stage prompts ───────────────────────────────────────────────────────────

export const prompts = {
  extract: {
    system: systemInstruction(
      "Extract the structured requirements from a job description.",
    ),
    build: (context: AnalysisContext) => `
${contextBlock(context)}

Extract from the JOB DESCRIPTION only (ignore the resume for this task):

1. The company name and the exact role title as written.
2. The seniority level implied (e.g. "Entry level", "Mid-level", "Senior").
3. MUST-HAVE requirements — the ones stated as required, essential, or minimum.
4. NICE-TO-HAVE requirements — stated as preferred, bonus, or a plus.
5. Core responsibilities of the role.
6. Soft skills the JD asks for.
7. Education requirements.
8. Experience requirements (years, domain, seniority).

For each requirement, include the surrounding context that explains why the role
needs it. If the JD does not state something, return an empty list for it rather
than inventing plausible entries.
`.trim(),
  },

  score: {
    system: systemInstruction(
      "Score how well a resume matches a job description across ten dimensions.",
    ),
    build: (context: AnalysisContext, extraction: string) => `
${contextBlock(context)}

=== EXTRACTED JD REQUIREMENTS ===
${extraction}

Score the resume against this JD from 0 to 100 on each dimension:

- experienceScore: does their actual experience match what the role needs?
- skillsScore: do their demonstrated skills cover the required ones?
- keywordAtsScore: would an ATS keyword match rank this resume well?
- responsibilityScore: have they done work resembling the responsibilities?
- industryScore: is their industry background relevant?
- seniorityScore: does their level match the role's level?
- educationScore: does their education meet the stated requirements?
- quantificationScore: how well are their achievements backed by measurable evidence?
- recruiterReadability: how quickly can a human parse this resume?
- overallRecruiterAppeal: would a recruiter shortlist this candidate?

Then give overallScore — a considered judgement of overall fit, NOT a simple
average. Weight the must-have requirements most heavily.

Be honest and calibrated. A genuinely weak match should score below 50. Do not
inflate scores to be encouraging. In "reasoning", explain the overall score in
two or three sentences, citing specifics from the resume.
`.trim(),
  },

  gaps: {
    system: systemInstruction(
      "Explain, requirement by requirement, where a resume falls short of a job description.",
    ),
    build: (context: AnalysisContext, extraction: string) => `
${contextBlock(context)}

=== EXTRACTED JD REQUIREMENTS ===
${extraction}

For EVERY must-have and nice-to-have requirement, produce one entry:

- requirement: the requirement, restated concisely.
- status: "strong" if the resume clearly demonstrates it, "partial" if it is
  implied or adjacent, "missing" if there is no evidence at all.
- current: quote or paraphrase what the resume actually says about it. If the
  resume says nothing, write "Not mentioned."
- gap: what is missing, specifically. Empty string when status is "strong".
- recommendation: exactly what the candidate should add or reword. Reference
  only experience the resume already implies. Where the requirement is genuinely
  absent, say so and prefix the suggestion with "Only add this if you genuinely
  have this experience:".

Cover every requirement. Do not skip ones the candidate fails — those are the
most useful entries in the whole report.
`.trim(),
  },

  bullets: {
    system: systemInstruction(
      "Score and improve resume bullet points using STAR methodology.",
    ),
    build: (context: AnalysisContext) => `
${contextBlock(context)}

Identify every experience bullet point in the resume. For each one, score 0–100:

- clarity: is the accomplishment immediately understandable?
- impact: does it convey meaningful business value?
- relevance: does it matter for THIS job description?
- quantification: is it backed by measurable evidence?
- actionVerb: does it open with a strong, specific verb?
- jdAlignment: does it use language the JD would recognise?
- readability: is it concise and scannable?
- starStructure: does it convey Action + What + How/Scope + Result?

Then:
- issues: the specific problems, as short phrases. Empty when the bullet is strong.
- suggested: an improved rewrite. Follow "Action + what + how/scope + quantified
  result". Keep it to one or two lines — never a paragraph. Preserve every fact,
  company, date, and number exactly as written. If the bullet lacks a metric,
  keep the placeholder visible (for example "reducing processing time by X%") so
  the candidate fills in a real figure.
- whatChanged: one sentence on what the rewrite improved and why.

Analyse at most 15 bullets, prioritising the ones most relevant to this JD.
`.trim(),
  },

  keywords: {
    system: systemInstruction(
      "Compare job description keywords against a resume.",
    ),
    build: (context: AnalysisContext) => `
${contextBlock(context)}

Extract the meaningful keywords and phrases from the JOB DESCRIPTION, then check
each against the resume.

- present: JD keywords that genuinely appear in the resume.
- missing: JD keywords absent from the resume. Include only ones that matter.
- overused: words the resume repeats to the point of weakening it (for example
  "responsible for", "managed", "worked on").
- byCategory: the JD's keywords grouped into technical, functional, industry,
  and softSkills.

Match on meaning, not just exact strings — "SQL queries" in the resume counts as
covering "SQL". Do not list a keyword as present if the resume only implies it
vaguely.
`.trim(),
  },

  ats: {
    system: systemInstruction(
      "Audit a resume for applicant tracking system compatibility.",
    ),
    build: (context: AnalysisContext) => `
${contextBlock(context)}

Assess how well this resume survives ATS parsing. Note that you are reading text
already extracted from the PDF, so judge what that extraction reveals.

Check: section structure and headings, job title alignment with the target role,
date formatting consistency, skill terminology, keyword placement, contact
details, evidence of multi-column layouts or tables (which show up as jumbled
text), unparseable characters, and overall length.

Give atsScore 0–100, then list concrete issues. For each: level ("error" for
things that break parsing, "warning" for things that weaken ranking, "info" for
minor polish), the area affected, a plain-language message with no jargon, and
the specific fix.

If the resume is genuinely clean, return few issues and a high score. Do not
invent problems to appear thorough.
`.trim(),
  },

  recruiter: {
    system: systemInstruction(
      "Simulate a recruiter's 10-second first scan of a resume.",
    ),
    build: (context: AnalysisContext) => `
${contextBlock(context)}

Simulate a recruiter spending TEN SECONDS scanning this resume for this role.
They read the top third, the job titles, the company names, and little else.

Answer these eight questions as that recruiter:
1. Is it obvious what role this person currently does?
2. Is it obvious they have the required years of experience?
3. Do the job titles signal relevance to this role?
4. Are the companies recognisable or credible for this industry?
5. Is the key required skill visible without scrolling?
6. Is there a quantified achievement visible immediately?
7. Does the education requirement appear to be met?
8. Would you keep reading past ten seconds?

For each: the answer, and answerable = true only if a recruiter could determine
it within ten seconds.

Then give a verdict — "strong", "potential", or "weak" — and explain it in two
or three sentences describing what the recruiter would actually notice first.
`.trim(),
  },

  actionPlan: {
    system: systemInstruction(
      "Turn a resume analysis into a prioritized fix list.",
    ),
    build: (context: AnalysisContext, findings: string) => `
${contextBlock(context)}

=== FINDINGS SO FAR ===
${findings}

Produce a prioritized action plan — the highest-leverage fixes first. Aim for
five to eight actions; fewer if the resume is genuinely strong.

For each action:
- priority: 1 is most important. Number them sequentially.
- title: a short imperative, e.g. "Add payments domain language to your summary".
- problem: what is wrong right now.
- why: why it costs them interviews for THIS role specifically.
- solution: exactly what to do.
- example: a concrete before/after, using only facts already in the resume. Use
  placeholders like "X%" where a real metric is needed.
- effort: "quick" (under 5 minutes), "moderate" (15–30 minutes), or
  "significant" (a rewrite).

Order by impact on getting an interview for this specific role.
`.trim(),
  },

  summary: {
    system: systemInstruction(
      "Write a tailored professional summary for a specific job description.",
    ),
    build: (context: AnalysisContext) => `
${contextBlock(context)}

Write a professional summary tailored to this JD.

- currentSummary: the resume's existing summary, quoted exactly. If there is no
  summary section, return an empty string.
- recommendedSummary: a replacement of at most three lines. It must be specific,
  recruiter-friendly, and use language from the JD — while containing ONLY facts
  the resume already supports. Lead with the role identity and years of
  experience, then the most relevant capability, then the strongest proof point.
  Reuse a real metric from the resume if one exists; otherwise use a placeholder.
  No clichés: avoid "results-driven", "detail-oriented", "proven track record",
  "passionate", "dynamic".
- whyBetter: two or three sentences on what changed and why it lands better with
  a recruiter for this role.
`.trim(),
  },
} as const;
