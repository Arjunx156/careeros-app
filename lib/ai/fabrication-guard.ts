/**
 * Anti-fabrication guard.
 *
 * The PRD's hardest requirement is that the AI never invents experience,
 * metrics, or skills. Prompt instructions reduce that risk but do not enforce
 * it — models still occasionally "improve" a bullet by inventing a number.
 *
 * So every AI-suggested rewrite is mechanically checked: any quantity that
 * appears in the suggestion must also appear in the source the model was given.
 * A suggestion that invents one is rejected and the stage re-runs.
 *
 * Placeholders are explicitly allowed. We instruct the model to write "X%" or
 * "[number]" when a metric would strengthen a bullet but the resume does not
 * supply one — that is the honest behaviour we want, not a violation.
 */

/** Tokens that mean "insert a real number here", which the model may emit. */
const PLACEHOLDER_PATTERN =
  /^(x+|n+|y+|z+|\[[^\]]*\]|<[^>]*>|_+|\?+|#+)$/i;

/**
 * Pull comparable numeric quantities out of text.
 *
 * Normalizes thousands separators so "50,000" and "50000" compare equal, and
 * drops trailing zeros on decimals so "3.0" matches "3".
 */
export function extractQuantities(text: string): string[] {
  if (!text) return [];

  const matches = text.matchAll(/\d[\d,._]*\d|\d/g);
  const quantities: string[] = [];

  for (const match of matches) {
    const normalized = normalizeQuantity(match[0]);
    if (normalized) quantities.push(normalized);
  }

  return quantities;
}

function normalizeQuantity(raw: string): string | null {
  // Strip grouping separators, keep a single decimal point.
  const cleaned = raw.replace(/[,_]/g, "");
  const value = Number(cleaned);

  if (!Number.isFinite(value)) return null;
  // Trailing-zero-insensitive canonical form.
  return String(value);
}

/** True when the token is a placeholder rather than a claimed measurement. */
export function isPlaceholder(token: string): boolean {
  return PLACEHOLDER_PATTERN.test(token.trim());
}

export type FabricationCheck = {
  ok: boolean;
  /** Quantities present in the suggestion but absent from every source. */
  fabricated: string[];
};

/**
 * Check a single AI-generated string against the source material it may draw on.
 *
 * `sources` should include the original bullet AND the full resume text — a
 * model legitimately moves a metric from one part of the resume into a bullet.
 */
export function checkForFabricatedNumbers(
  suggestion: string,
  sources: readonly string[],
): FabricationCheck {
  const suggested = extractQuantities(suggestion);
  if (suggested.length === 0) return { ok: true, fabricated: [] };

  const allowed = new Set(sources.flatMap((source) => extractQuantities(source)));

  const fabricated = [...new Set(suggested.filter((value) => !allowed.has(value)))];

  return { ok: fabricated.length === 0, fabricated };
}

/**
 * Strip a fabricated quantity down to a placeholder rather than discarding the
 * whole suggestion.
 *
 * Used as a fallback when a retry still produces an invented number: the
 * rewrite's wording is usually still an improvement, and replacing "40%" with
 * "X%" turns a false claim into an honest prompt for the user to fill in.
 */
export function redactFabricatedNumbers(
  suggestion: string,
  fabricated: readonly string[],
): string {
  if (fabricated.length === 0) return suggestion;

  const targets = new Set(fabricated);

  return suggestion.replace(/\d[\d,._]*\d|\d/g, (match) => {
    const normalized = normalizeQuantity(match);
    return normalized && targets.has(normalized) ? "X" : match;
  });
}
