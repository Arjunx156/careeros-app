/**
 * Structured facts extracted from a resume — parsed once, reused by every stage.
 *
 * Two reasons this exists:
 *
 *   1. Cost. Previously all nine pipeline stages resent the full resume and
 *      full JD; 75% of input tokens were redundant. Stages now receive only the
 *      snippets relevant to what they are judging.
 *
 *   2. Verifiability. Every bullet gets a stable id, so an AI claim can cite
 *      the evidence it rests on. A claim citing an id that does not exist is
 *      mechanically detectable, which is what turns "please don't fabricate"
 *      into something we can actually enforce.
 *
 * This module is pure and deterministic — no AI, no I/O.
 */

export type ResumeSection = {
  id: string;
  /** Normalized heading, e.g. "experience". Empty for pre-heading content. */
  kind: SectionKind;
  heading: string;
  startLine: number;
};

export type ResumeBullet = {
  /** Stable citation id: b1, b2, … Referenced by AI output. */
  id: string;
  text: string;
  sectionId: string;
  sectionKind: SectionKind;
  /** True when the line was marked with a bullet glyph rather than inferred. */
  isExplicitBullet: boolean;
  wordCount: number;
  /** Numeric quantities found in the bullet, normalized. */
  quantities: string[];
  /** Leading verb, lowercased — used for weak-verb detection. */
  leadingVerb: string | null;
};

export type DateRange = {
  raw: string;
  startYear: number | null;
  endYear: number | null;
  isCurrent: boolean;
};

export type SectionKind =
  | "header"
  | "summary"
  | "experience"
  | "education"
  | "skills"
  | "projects"
  | "certifications"
  | "other";

export type ResumeFacts = {
  sections: ResumeSection[];
  /** Experience/project bullets — the things that get rewritten. */
  bullets: ResumeBullet[];
  /**
   * Everything citable as evidence: the bullets, plus the summary and the
   * skills list as their own units.
   *
   * Retrieval and citation validation run over this, not over `bullets`.
   * Indexing only bullets meant a resume listing SQL in its skills section and
   * describing "SQL-backed reporting" in its summary had no retrievable
   * evidence for SQL at all, so the analyzer reported it missing.
   */
  evidence: ResumeBullet[];
  /** Skills listed in a dedicated skills section. */
  declaredSkills: string[];
  dateRanges: DateRange[];
  summaryText: string | null;
  /**
   * Years of professional experience, derived from date ranges.
   *
   * Computed rather than retrieved: "2+ years of experience" tokenizes to
   * nothing useful for lexical search, since "years" and "experience" appear in
   * every resume. Tenure is arithmetic over dates, so it is handed to the model
   * as a fact instead of being something it has to find.
   */
  totalExperienceYears: number | null;
  contact: { email: string | null; phone: string | null; links: string[] };
  totalWords: number;
};

// ─── Section heading detection ───────────────────────────────────────────────

const SECTION_PATTERNS: Array<{ kind: SectionKind; pattern: RegExp }> = [
  {
    kind: "summary",
    pattern: /^(professional\s+)?(summary|profile|objective|about)\b/i,
  },
  {
    kind: "experience",
    pattern:
      /^(work\s+|professional\s+|relevant\s+)?(experience|employment|history)\b/i,
  },
  { kind: "education", pattern: /^(education|academic|qualifications)\b/i },
  {
    kind: "skills",
    pattern:
      /^(technical\s+|core\s+|key\s+)?(skills|competencies|expertise|technologies)\b/i,
  },
  { kind: "projects", pattern: /^(projects|portfolio|selected\s+work)\b/i },
  {
    kind: "certifications",
    pattern: /^(certifications?|licenses?|awards?|publications?)\b/i,
  },
];

const BULLET_GLYPH = /^[\s]*[•·▪◦‣∙*\-–—]\s+/;

/**
 * A heading is short, has no sentence punctuation, and is either ALL CAPS or
 * matches a known section name. Requiring both shape and brevity avoids
 * mistaking a capitalized sentence for a heading.
 */
function detectHeading(
  line: string,
): { kind: SectionKind; heading: string } | null {
  const trimmed = line.trim();
  if (trimmed.length === 0 || trimmed.length > 60) return null;
  if (BULLET_GLYPH.test(line)) return null;
  if (/[.;:,]$/.test(trimmed) && !/:$/.test(trimmed)) return null;

  const withoutTrailingColon = trimmed.replace(/:$/, "");

  for (const { kind, pattern } of SECTION_PATTERNS) {
    if (pattern.test(withoutTrailingColon))
      return { kind, heading: withoutTrailingColon };
  }

  const letters = withoutTrailingColon.replace(/[^a-z]/gi, "");
  const isAllCaps =
    letters.length >= 3 &&
    letters === letters.toUpperCase() &&
    /^[A-Z0-9\s&/,'-]+$/.test(withoutTrailingColon);

  if (isAllCaps) return { kind: "other", heading: withoutTrailingColon };

  return null;
}

// ─── Line joining ────────────────────────────────────────────────────────────

/**
 * PDF extraction wraps lines mid-sentence. Rejoin a continuation onto its
 * predecessor so a bullet reads as one unit rather than two fragments.
 */
export function joinWrappedLines(lines: string[]): string[] {
  const joined: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (line.trim().length === 0) {
      joined.push("");
      continue;
    }

    const previous = joined.at(-1);
    const startsNewBlock =
      BULLET_GLYPH.test(line) ||
      detectHeading(line) !== null ||
      previous === undefined ||
      previous.trim().length === 0;

    // A continuation starts lowercase and follows a line with no terminator.
    const previousIsOpen =
      previous !== undefined &&
      previous.trim().length > 0 &&
      !/[.!?:]$/.test(previous.trim());
    const looksLikeContinuation = /^[a-z(]/.test(line.trim());

    if (!startsNewBlock && previousIsOpen && looksLikeContinuation) {
      joined[joined.length - 1] = `${previous} ${line.trim()}`;
      continue;
    }

    joined.push(line);
  }

  return joined;
}

// ─── Quantities and verbs ────────────────────────────────────────────────────

export function extractQuantities(text: string): string[] {
  const found: string[] = [];
  for (const match of text.matchAll(/\d[\d,._]*\d|\d/g)) {
    const value = Number(match[0].replace(/[,_]/g, ""));
    if (Number.isFinite(value)) found.push(String(value));
  }
  return [...new Set(found)];
}

/** Verbs that describe duty rather than accomplishment. */
export const WEAK_VERBS = new Set([
  "responsible",
  "worked",
  "helped",
  "assisted",
  "participated",
  "involved",
  "handled",
  "managed",
  "supported",
  "tasked",
  "duties",
  "various",
]);

function leadingVerbOf(text: string): string | null {
  const first = text
    .replace(BULLET_GLYPH, "")
    .trim()
    .split(/\s+/)[0]
    ?.toLowerCase()
    .replace(/[^a-z]/g, "");
  return first && first.length > 1 ? first : null;
}

// ─── Dates ───────────────────────────────────────────────────────────────────

const MONTH = "(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*";
const DATE_RANGE = new RegExp(
  `(?:${MONTH}\\s*)?((?:19|20)\\d{2})\\s*(?:[-–—]|to)\\s*(?:(?:${MONTH}\\s*)?((?:19|20)\\d{2})|(present|current|now))`,
  "gi",
);

export function extractDateRanges(text: string): DateRange[] {
  const ranges: DateRange[] = [];

  for (const match of text.matchAll(DATE_RANGE)) {
    const [raw, , startYear, , endYear, current] = match;
    ranges.push({
      raw: raw.trim(),
      startYear: startYear ? Number(startYear) : null,
      endYear: endYear ? Number(endYear) : null,
      isCurrent: Boolean(current),
    });
  }

  return ranges;
}

/**
 * Total years spanned by the date ranges, merging overlaps so concurrent roles
 * are not double-counted.
 */
export function computeExperienceYears(ranges: readonly DateRange[]): number | null {
  const currentYear = new Date().getFullYear();

  const spans = ranges
    .filter((range) => range.startYear !== null)
    .map((range) => ({
      start: range.startYear as number,
      end: range.isCurrent ? currentYear : (range.endYear ?? range.startYear as number),
    }))
    .filter((span) => span.end >= span.start)
    .sort((a, b) => a.start - b.start);

  if (spans.length === 0) return null;

  let total = 0;
  let cursor = -Infinity;

  for (const span of spans) {
    const from = Math.max(span.start, cursor);
    if (span.end > from) total += span.end - from;
    cursor = Math.max(cursor, span.end);
  }

  return total;
}

// ─── Skills ──────────────────────────────────────────────────────────────────

function parseSkillList(text: string): string[] {
  return text
    .split(/[,;|·••]|\s{2,}/)
    .map((part) => part.trim().replace(/^[-–—:]\s*/, ""))
    .filter(
      (part) => part.length > 1 && part.length <= 40 && /[a-z]/i.test(part),
    );
}

// ─── Contact ─────────────────────────────────────────────────────────────────

function extractContact(text: string) {
  const email = text.match(/[\w.+-]+@[\w-]+\.[\w.]+/)?.[0] ?? null;
  const phone =
    text.match(
      /(?:\+\d{1,3}[\s-]?)?\(?\d{2,4}\)?[\s-]?\d{3,4}[\s-]?\d{3,4}/,
    )?.[0] ?? null;
  const links = [...text.matchAll(/(?:https?:\/\/|www\.)[^\s)]+/gi)].map(
    (m) => m[0],
  );
  return { email, phone, links: [...new Set(links)] };
}

// ─── Main parser ─────────────────────────────────────────────────────────────

export function parseResumeFacts(resumeText: string): ResumeFacts {
  const lines = joinWrappedLines(resumeText.split("\n"));

  const sections: ResumeSection[] = [];
  const bullets: ResumeBullet[] = [];
  const declaredSkills: string[] = [];

  let currentSection: ResumeSection = {
    id: "s0",
    kind: "header",
    heading: "",
    startLine: 0,
  };
  sections.push(currentSection);

  const summaryLines: string[] = [];

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed.length === 0) return;

    const heading = detectHeading(line);
    if (heading) {
      currentSection = {
        id: `s${sections.length}`,
        kind: heading.kind,
        heading: heading.heading,
        startLine: index,
      };
      sections.push(currentSection);
      return;
    }

    if (currentSection.kind === "skills") {
      declaredSkills.push(...parseSkillList(trimmed));
      return;
    }

    if (currentSection.kind === "summary") {
      summaryLines.push(trimmed);
      return;
    }

    const isExplicitBullet = BULLET_GLYPH.test(line);
    const text = trimmed.replace(BULLET_GLYPH, "").trim();

    // Only substantive lines become citable bullets. Job titles and one-word
    // lines are context, not claims that need evidence.
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const isCitable =
      isExplicitBullet ||
      (wordCount >= 6 &&
        (currentSection.kind === "experience" ||
          currentSection.kind === "projects" ||
          currentSection.kind === "other"));

    if (!isCitable) return;

    bullets.push({
      id: `b${bullets.length + 1}`,
      text,
      sectionId: currentSection.id,
      sectionKind: currentSection.kind,
      isExplicitBullet,
      wordCount,
      quantities: extractQuantities(text),
      leadingVerb: leadingVerbOf(text),
    });
  });

  const summaryText = summaryLines.length > 0 ? summaryLines.join(" ") : null;
  const uniqueSkills = [...new Set(declaredSkills)];

  // Summary and skills become citable units alongside the bullets. Distinct id
  // prefixes keep them recognisable in a citation: s1 = summary, k1 = skills.
  const extraEvidence: ResumeBullet[] = [];

  if (summaryText) {
    extraEvidence.push({
      id: "s1",
      text: summaryText,
      sectionId: "summary",
      sectionKind: "summary",
      isExplicitBullet: false,
      wordCount: summaryText.split(/s+/).filter(Boolean).length,
      quantities: extractQuantities(summaryText),
      leadingVerb: null,
    });
  }

  if (uniqueSkills.length > 0) {
    const skillsText = uniqueSkills.join(", ");
    extraEvidence.push({
      id: "k1",
      text: skillsText,
      sectionId: "skills",
      sectionKind: "skills",
      isExplicitBullet: false,
      wordCount: uniqueSkills.length,
      quantities: [],
      leadingVerb: null,
    });
  }

  return {
    sections,
    bullets,
    evidence: [...bullets, ...extraEvidence],
    declaredSkills: uniqueSkills,
    dateRanges: extractDateRanges(resumeText),
    summaryText,
    totalExperienceYears: computeExperienceYears(extractDateRanges(resumeText)),
    contact: extractContact(resumeText),
    totalWords: resumeText.split(/\s+/).filter(Boolean).length,
  };
}

/** Look up evidence units by id, ignoring ids that do not exist. */
export function bulletsByIds(
  facts: ResumeFacts,
  ids: readonly string[],
): ResumeBullet[] {
  const index = new Map(facts.evidence.map((bullet) => [bullet.id, bullet]));
  return ids
    .map((id) => index.get(id))
    .filter((bullet): bullet is ResumeBullet => bullet !== undefined);
}
