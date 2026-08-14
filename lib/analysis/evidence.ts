/**
 * Evidence validation — the layer that makes a hallucination unable to persist.
 *
 * No prompt makes an LLM incapable of inventing things. What we can do is
 * require every claim to cite the resume bullets it rests on, then check those
 * citations mechanically:
 *
 *   - a cited bullet id that does not exist is dropped
 *   - a claim left with no valid citation is marked `unsupported`
 *   - a number that appears in neither the cited evidence nor the resume is
 *     replaced with a placeholder
 *
 * An unsupported claim is not deleted. It is labelled, and the UI renders it as
 * "not evidenced" — visible to the user as something the AI asserted without
 * backing, rather than silently presented as fact.
 */

import type { ResumeFacts } from "@/lib/analysis/facts";
import { extractQuantities } from "@/lib/analysis/facts";

/** Any AI output that cites resume evidence. */
export type EvidencedClaim = {
  /** Bullet ids the model says support this claim. */
  supportingBulletIds: string[];
  /** Set by the validator, never trusted from the model. */
  unsupported?: boolean;
};

export type ValidationOutcome<T> = {
  claim: T;
  /** Ids the model cited that do not exist in the resume. */
  invalidIds: string[];
  /** Numbers asserted that appear nowhere in the source. */
  fabricatedNumbers: string[];
};

export type ValidationReport = {
  totalClaims: number;
  unsupportedClaims: number;
  invalidCitations: string[];
  fabricatedNumbers: string[];
};

/** Text of the cited bullets, plus the whole resume as a fallback source. */
function evidenceTextFor(
  facts: ResumeFacts,
  ids: readonly string[],
): string {
  const index = new Map(facts.evidence.map((b) => [b.id, b.text]));
  return ids.map((id) => index.get(id) ?? "").join(" ");
}

/** Every quantity that legitimately exists anywhere in the resume. */
function resumeQuantities(facts: ResumeFacts): Set<string> {
  const all = new Set<string>();
  for (const item of facts.evidence) {
    for (const quantity of item.quantities) all.add(quantity);
  }
  for (const range of facts.dateRanges) {
    if (range.startYear) all.add(String(range.startYear));
    if (range.endYear) all.add(String(range.endYear));
  }
  if (facts.summaryText) {
    for (const quantity of extractQuantities(facts.summaryText)) all.add(quantity);
  }
  return all;
}

/**
 * Validate one claim.
 *
 * `assertedText` is any prose the model wrote for this claim — the part that
 * could contain an invented figure.
 */
export function validateClaim<T extends EvidencedClaim>(
  claim: T,
  assertedText: string,
  facts: ResumeFacts,
  allowedQuantities: Set<string>,
): ValidationOutcome<T> {
  const known = new Set(facts.evidence.map((b) => b.id));

  const validIds = claim.supportingBulletIds.filter((id) => known.has(id));
  const invalidIds = claim.supportingBulletIds.filter((id) => !known.has(id));

  const asserted = extractQuantities(assertedText);
  const fabricatedNumbers = [
    ...new Set(asserted.filter((value) => !allowedQuantities.has(value))),
  ];

  return {
    claim: {
      ...claim,
      supportingBulletIds: validIds,
      // A claim with no surviving citation is unsupported, whatever the model said.
      unsupported: validIds.length === 0,
    },
    invalidIds,
    fabricatedNumbers,
  };
}

/**
 * Validate a batch of claims and summarize what was wrong.
 *
 * `textOf` selects the prose to scan for invented numbers.
 */
export function validateClaims<T extends EvidencedClaim>(
  claims: readonly T[],
  textOf: (claim: T) => string,
  facts: ResumeFacts,
): { claims: T[]; report: ValidationReport } {
  const allowed = resumeQuantities(facts);

  const outcomes = claims.map((claim) =>
    validateClaim(claim, textOf(claim), facts, allowed),
  );

  return {
    claims: outcomes.map((outcome) => outcome.claim),
    report: {
      totalClaims: outcomes.length,
      unsupportedClaims: outcomes.filter((o) => o.claim.unsupported).length,
      invalidCitations: [...new Set(outcomes.flatMap((o) => o.invalidIds))],
      fabricatedNumbers: [...new Set(outcomes.flatMap((o) => o.fabricatedNumbers))],
    },
  };
}

/**
 * Replace invented figures with a placeholder.
 *
 * Preferred over discarding the whole suggestion: the rewrite's wording is
 * usually still an improvement, and "X%" is an honest prompt for the user to
 * supply a real number rather than a false claim.
 */
export function redactFabricatedNumbers(
  text: string,
  allowed: Set<string>,
): { text: string; redacted: string[] } {
  const redacted: string[] = [];

  const result = text.replace(/\d[\d,._]*\d|\d/g, (match) => {
    const value = Number(match.replace(/[,_]/g, ""));
    if (!Number.isFinite(value)) return match;

    const normalized = String(value);
    if (allowed.has(normalized)) return match;

    redacted.push(normalized);
    return "X";
  });

  return { text: result, redacted: [...new Set(redacted)] };
}

/** Convenience wrapper for callers that only have the facts. */
export function allowedQuantitiesFor(facts: ResumeFacts): Set<string> {
  return resumeQuantities(facts);
}

export { evidenceTextFor };
