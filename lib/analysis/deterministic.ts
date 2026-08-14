/**
 * Deterministic analysis — the parts of the report that are measurement, not judgment.
 *
 * Keyword matching, ATS structural checks, quantification rates and readability
 * are string and arithmetic problems. Asking an LLM to do them cost two API
 * calls per analysis and produced answers that varied between runs on identical
 * input. Here they are pure functions: same resume, same numbers, every time,
 * and they cost nothing against the request quota.
 *
 * The LLM still decides which JD terms matter (judgment). This module only
 * decides whether the resume contains them (measurement).
 */

import type { ResumeFacts } from "@/lib/analysis/facts";
import { WEAK_VERBS } from "@/lib/analysis/facts";

// ─── Text normalization ──────────────────────────────────────────────────────

/** Lowercase, strip punctuation, collapse whitespace — for substring matching. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Light stemming so "reporting" matches "reports".
 * Deliberately crude: a real stemmer would over-merge distinct skills.
 */
export function stem(word: string): string {
  return word
    .replace(/(ing|ed|es|s)$/i, "")
    .replace(/(y)$/i, "i");
}

function tokenSet(text: string): Set<string> {
  return new Set(
    normalize(text)
      .split(" ")
      .filter((token) => token.length > 1)
      .map(stem),
  );
}

/**
 * Does the haystack contain this term?
 *
 * Multi-word terms must appear as a phrase; single words match on stems so
 * plural and tense variations still count.
 */
export function containsTerm(haystack: string, term: string): boolean {
  const normalizedTerm = normalize(term);
  if (normalizedTerm.length === 0) return false;

  const normalizedHaystack = normalize(haystack);

  if (normalizedTerm.includes(" ")) {
    return normalizedHaystack.includes(normalizedTerm);
  }

  const tokens = tokenSet(normalizedHaystack);
  return tokens.has(stem(normalizedTerm));
}

/** How many times a term appears — used to flag overuse. */
export function countOccurrences(haystack: string, term: string): number {
  const normalizedTerm = normalize(term);
  if (normalizedTerm.length === 0) return 0;

  const escaped = normalizedTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = normalizedTerm.includes(" ")
    ? new RegExp(escaped, "g")
    : new RegExp(`\\b${escaped}\\w*`, "g");

  return normalize(haystack).match(pattern)?.length ?? 0;
}

// ─── Keyword analysis ────────────────────────────────────────────────────────

export type KeywordAnalysis = {
  present: string[];
  missing: string[];
  overused: string[];
};

const OVERUSE_THRESHOLD = 4;

/** Filler that reads as padding when repeated. */
const FILLER_PHRASES = [
  "responsible for",
  "duties included",
  "worked on",
  "helped with",
  "various",
  "team player",
  "detail oriented",
  "hard working",
  "results driven",
  "self starter",
];

export function analyzeKeywords(
  jdTerms: readonly string[],
  resumeText: string,
): KeywordAnalysis {
  const present: string[] = [];
  const missing: string[] = [];

  for (const term of jdTerms) {
    if (term.trim().length === 0) continue;
    (containsTerm(resumeText, term) ? present : missing).push(term);
  }

  const overused = FILLER_PHRASES.filter(
    (phrase) => countOccurrences(resumeText, phrase) >= 2,
  );

  // A JD term repeated many times reads as keyword stuffing.
  for (const term of present) {
    if (countOccurrences(resumeText, term) >= OVERUSE_THRESHOLD) overused.push(term);
  }

  return {
    present,
    missing,
    overused: [...new Set(overused)],
  };
}

// ─── ATS structural analysis ─────────────────────────────────────────────────

export type AtsIssue = {
  level: "error" | "warning" | "info";
  message: string;
  /** Bullet ids the issue points at, when applicable. */
  bulletIds?: string[];
};

export type AtsAnalysis = {
  score: number;
  issues: AtsIssue[];
};

const MAX_BULLET_WORDS = 40;
const MIN_BULLET_WORDS = 4;
const MAX_RESUME_WORDS = 1000;

/**
 * Characters that signal the text came out of a table, text box, or a broken
 * font encoding — all of which ATS parsers handle badly.
 *
 * Checked by code point rather than a literal regex so the intent is readable
 * and the source file contains no invisible characters.
 */
const PARSER_HOSTILE_CODE_POINTS = new Set([
  0xfffd, // replacement character — encoding already lost information
  0x200b, // zero-width space
  0x00a0, // non-breaking space
  0x2028, // line separator
  0x2029, // paragraph separator
]);

export function hasParserHostileChars(text: string): boolean {
  for (const char of text) {
    if (PARSER_HOSTILE_CODE_POINTS.has(char.codePointAt(0) ?? 0)) return true;
  }
  return false;
}

export function analyzeAts(facts: ResumeFacts, resumeText: string): AtsAnalysis {
  const issues: AtsIssue[] = [];
  const kinds = new Set(facts.sections.map((section) => section.kind));

  // — Section structure —
  if (!kinds.has("experience")) {
    issues.push({
      level: "error",
      message:
        "No recognizable Experience section. ATS parsers key off standard headings — use the literal word \"Experience\".",
    });
  }
  if (!kinds.has("education")) {
    issues.push({
      level: "warning",
      message: "No recognizable Education section heading.",
    });
  }
  if (!kinds.has("skills")) {
    issues.push({
      level: "warning",
      message:
        "No dedicated Skills section. A plain comma-separated list is the most reliably parsed format.",
    });
  }

  // — Contact —
  if (!facts.contact.email) {
    issues.push({
      level: "error",
      message: "No email address found. Many parsers reject a resume with no contact email.",
    });
  }

  // — Dates —
  if (facts.dateRanges.length === 0) {
    issues.push({
      level: "warning",
      message:
        "No date ranges detected. Use a consistent format such as \"Jan 2023 – Present\" on every role.",
    });
  }

  // — Bullets —
  const longBullets = facts.bullets.filter((b) => b.wordCount > MAX_BULLET_WORDS);
  if (longBullets.length > 0) {
    issues.push({
      level: "warning",
      message: `${longBullets.length} bullet${longBullets.length === 1 ? " is" : "s are"} over ${MAX_BULLET_WORDS} words. Recruiters scan; long bullets get skipped.`,
      bulletIds: longBullets.map((b) => b.id),
    });
  }

  const shortBullets = facts.bullets.filter((b) => b.wordCount < MIN_BULLET_WORDS);
  if (shortBullets.length > 0) {
    issues.push({
      level: "info",
      message: `${shortBullets.length} bullet${shortBullets.length === 1 ? " is" : "s are"} very short and may not carry enough detail.`,
      bulletIds: shortBullets.map((b) => b.id),
    });
  }

  const weakVerbBullets = facts.bullets.filter(
    (b) => b.leadingVerb !== null && WEAK_VERBS.has(b.leadingVerb),
  );
  if (weakVerbBullets.length > 0) {
    issues.push({
      level: "warning",
      message: `${weakVerbBullets.length} bullet${weakVerbBullets.length === 1 ? "" : "s"} start with a duty verb such as "Responsible for". Lead with the action you took.`,
      bulletIds: weakVerbBullets.map((b) => b.id),
    });
  }

  // — Length —
  if (facts.totalWords > MAX_RESUME_WORDS) {
    issues.push({
      level: "info",
      message: `The resume is ${facts.totalWords} words. Under ${MAX_RESUME_WORDS} reads better for an early-career profile.`,
    });
  }

  // — Characters that break parsers —
  if (hasParserHostileChars(resumeText)) {
    issues.push({
      level: "error",
      message:
        "Unusual characters detected, which often means text sits inside a table or text box. Both break ATS parsing.",
    });
  }

  const score = scoreFromIssues(issues, facts);
  return { score, issues };
}

/**
 * ATS score from measured deficiencies.
 *
 * Starts at 100 and deducts per issue by severity, with a bonus band for
 * quantification, so the number is explainable from the issue list rather than
 * being an opaque model output.
 */
function scoreFromIssues(issues: readonly AtsIssue[], facts: ResumeFacts): number {
  const WEIGHTS = { error: 18, warning: 8, info: 3 } as const;

  let score = 100;
  for (const issue of issues) score -= WEIGHTS[issue.level];

  // Reward evidence density; a resume of unquantified duties scores lower.
  const rate = quantificationRate(facts);
  if (rate < 0.2) score -= 10;
  else if (rate >= 0.5) score += 5;

  return Math.max(0, Math.min(100, Math.round(score)));
}

// ─── Quantification and readability ──────────────────────────────────────────

/** Share of bullets containing at least one measurable quantity. */
export function quantificationRate(facts: ResumeFacts): number {
  if (facts.bullets.length === 0) return 0;
  const withNumbers = facts.bullets.filter((b) => b.quantities.length > 0).length;
  return withNumbers / facts.bullets.length;
}

export type ReadabilityAnalysis = {
  score: number;
  averageBulletWords: number;
  longestBulletWords: number;
  weakVerbCount: number;
  unquantifiedBulletIds: string[];
};

export function analyzeReadability(facts: ResumeFacts): ReadabilityAnalysis {
  if (facts.bullets.length === 0) {
    return {
      score: 0,
      averageBulletWords: 0,
      longestBulletWords: 0,
      weakVerbCount: 0,
      unquantifiedBulletIds: [],
    };
  }

  const wordCounts = facts.bullets.map((b) => b.wordCount);
  const average = wordCounts.reduce((sum, n) => sum + n, 0) / wordCounts.length;
  const longest = Math.max(...wordCounts);
  const weakVerbCount = facts.bullets.filter(
    (b) => b.leadingVerb !== null && WEAK_VERBS.has(b.leadingVerb),
  ).length;

  // 12–24 words is the band that scans well without losing substance.
  const lengthPenalty =
    average < 8 ? (8 - average) * 4 : average > 24 ? (average - 24) * 3 : 0;
  const weakPenalty = (weakVerbCount / facts.bullets.length) * 30;

  return {
    score: Math.max(0, Math.min(100, Math.round(100 - lengthPenalty - weakPenalty))),
    averageBulletWords: Math.round(average * 10) / 10,
    longestBulletWords: longest,
    weakVerbCount,
    unquantifiedBulletIds: facts.bullets
      .filter((b) => b.quantities.length === 0)
      .map((b) => b.id),
  };
}
