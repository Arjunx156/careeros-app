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
  bullets: ResumeBullet[];
  /** Skills listed in a dedicated skills section. */
  declaredSkills: string[];
  dateRanges: DateRange[];
  summaryText: string | null;
  contact: { email: string | null; phone: string | null; links: string[] };
  totalWords: number;
};

// ─── Section heading detection ───────────────────────────────────────────────

const SECTION_PATTERNS: Array<{ kind: SectionKind; pattern: RegExp }> = [
  { kind: "summary", pattern: /^(professional\s+)?(summary|profile|objective|about)\b/i },
  { kind: "experience", pattern: /^(work\s+|professional\s+|relevant\s+)?(experience|employment|history)\b/i },
  { kind: "education", pattern: /^(education|academic|qualifications)\b/i },
  { kind: "skills", pattern: /^(technical\s+|core\s+|key\s+)?(skills|competencies|expertise|technologies)\b/i },
  { kind: "projects", pattern: /^(projects|portfolio|selected\s+work)\b/i },
  { kind: "certifications", pattern: /^(certifications?|licenses?|awards?|publications?)\b/i },
];

const BULLET_GLYPH = /^[\s]*[•·▪◦‣∙*\-–—]\s+/;

/**
 * A heading is short, has no sentence punctuation, and is either ALL CAPS or
 * matches a known section name. Requiring both shape and brevity avoids
 * mistaking a capitalized sentence for a heading.
 */
function detectHeading(line: string): { kind: SectionKind; heading: string } | null {
  const trimmed = line.trim();
  if (trimmed.length === 0 || trimmed.length > 60) return null;
  if (BULLET_GLYPH.test(line)) return null;
  if (/[.;:,]$/.test(trimmed) && !/:$/.test(trimmed)) return null;

  const withoutTrailingColon = trimmed.replace(/:$/, "");

  for (const { kind, pattern } of SECTION_PATTERNS) {
    if (pattern.test(withoutTrailingColon)) return { kind, heading: withoutTrailingColon };
  }

  const letters = withoutTrailingColon.replace(/[^a-z]/gi, "");
  const isAllCaps =
    letters.length >= 3 && letters === letters.toUpperCase() && /^[A-Z0-9\s&/,'-]+$/.test(withoutTrailingColon);

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

// ─── Skills ──────────────────────────────────────────────────────────────────

function parseSkillList(text: string): string[] {
  return text
    .split(/[,;|·••]|\s{2,}/)
    .map((part) => part.trim().replace(/^[-–—:]\s*/, ""))
    .filter((part) => part.length > 1 && part.length <= 40 && /[a-z]/i.test(part));
}

// ─── Contact ─────────────────────────────────────────────────────────────────

function extractContact(text: string) {
  const email = text.match(/[\w.+-]+@[\w-]+\.[\w.]+/)?.[0] ?? null;
  const phone = text.match(/(?:\+\d{1,3}[\s-]?)?\(?\d{2,4}\)?[\s-]?\d{3,4}[\s-]?\d{3,4}/)?.[0] ?? null;
  const links = [...text.matchAll(/(?:https?:\/\/|www\.)[^\s)]+/gi)].map((m) => m[0]);
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

  let summaryLines: string[] = [];

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

  return {
    sections,
    bullets,
    declaredSkills: [...new Set(declaredSkills)],
    dateRanges: extractDateRanges(resumeText),
    summaryText: summaryLines.length > 0 ? summaryLines.join(" ") : null,
    contact: extractContact(resumeText),
    totalWords: resumeText.split(/\s+/).filter(Boolean).length,
  };
}

/** Look up bullets by id, ignoring ids that do not exist. */
export function bulletsByIds(
  facts: ResumeFacts,
  ids: readonly string[],
): ResumeBullet[] {
  const index = new Map(facts.bullets.map((bullet) => [bullet.id, bullet]));
  return ids
    .map((id) => index.get(id))
    .filter((bullet): bullet is ResumeBullet => bullet !== undefined);
}
