/**
 * Lexical evidence retrieval.
 *
 * For each JD requirement, find the handful of resume bullets most likely to
 * speak to it, so the model judges "does this evidence satisfy this
 * requirement?" instead of re-reading the whole resume for every question.
 *
 * Deliberately lexical (BM25-style) rather than embedding-based: a resume is a
 * few dozen short bullets, the vocabulary overlap with a JD is high, and an
 * embedding call would spend the very request budget this is meant to protect.
 * Embeddings can slot in behind the same interface later if recall proves
 * insufficient.
 */

import type { ResumeBullet, ResumeFacts } from "@/lib/analysis/facts";
import { normalize, stem } from "@/lib/analysis/deterministic";

/** Words too common to carry retrieval signal. */
const STOP_WORDS = new Set([
  "the", "and", "for", "with", "you", "our", "will", "are", "have", "has",
  "this", "that", "from", "your", "their", "they", "them", "was", "were",
  "been", "being", "into", "over", "such", "than", "then", "when", "who",
  "how", "what", "which", "while", "within", "across", "using", "use",
  "able", "must", "should", "would", "could", "can", "may", "also", "other",
  "including", "include", "includes", "well", "years", "year", "experience",
  "strong", "good", "great", "excellent", "ability", "work", "working",
  "role", "team", "teams", "join", "looking", "seeking", "candidate", "plus",
]);

function tokenize(text: string): string[] {
  return normalize(text)
    .split(" ")
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token))
    .map(stem);
}

export type ScoredBullet = {
  bullet: ResumeBullet;
  score: number;
  /** Terms from the query this bullet actually matched — shown to the model. */
  matchedTerms: string[];
};

/**
 * BM25-style relevance.
 *
 * Rare terms weigh more (idf), and a long bullet is not rewarded merely for
 * containing more words (length normalization).
 */
const K1 = 1.2;
const B = 0.6;

function buildIndex(bullets: readonly ResumeBullet[]) {
  const docs = bullets.map((bullet) => ({
    bullet,
    tokens: tokenize(bullet.text),
  }));

  const documentFrequency = new Map<string, number>();
  for (const doc of docs) {
    for (const token of new Set(doc.tokens)) {
      documentFrequency.set(token, (documentFrequency.get(token) ?? 0) + 1);
    }
  }

  const averageLength =
    docs.reduce((sum, doc) => sum + doc.tokens.length, 0) / (docs.length || 1);

  return { docs, documentFrequency, averageLength, total: docs.length };
}

export type RetrievalIndex = ReturnType<typeof buildIndex>;

export function indexResume(facts: ResumeFacts): RetrievalIndex {
  return buildIndex(facts.bullets);
}

/** Top-k bullets for a query, best first. Never returns zero-score matches. */
export function retrieveEvidence(
  index: RetrievalIndex,
  query: string,
  limit = 4,
): ScoredBullet[] {
  const queryTokens = [...new Set(tokenize(query))];
  if (queryTokens.length === 0 || index.total === 0) return [];

  const scored: ScoredBullet[] = [];

  for (const doc of index.docs) {
    const termCounts = new Map<string, number>();
    for (const token of doc.tokens) {
      termCounts.set(token, (termCounts.get(token) ?? 0) + 1);
    }

    let score = 0;
    const matchedTerms: string[] = [];

    for (const token of queryTokens) {
      const frequency = termCounts.get(token);
      if (!frequency) continue;

      matchedTerms.push(token);

      const df = index.documentFrequency.get(token) ?? 0;
      // +0.5 smoothing keeps idf positive even for a term in every bullet.
      const idf = Math.log(1 + (index.total - df + 0.5) / (df + 0.5));
      const normalizedLength =
        doc.tokens.length / (index.averageLength || 1);

      score +=
        idf *
        ((frequency * (K1 + 1)) /
          (frequency + K1 * (1 - B + B * normalizedLength)));
    }

    if (score > 0) scored.push({ bullet: doc.bullet, score, matchedTerms });
  }

  return scored
    .sort((a, b) => b.score - a.score || a.bullet.id.localeCompare(b.bullet.id))
    .slice(0, limit);
}

/**
 * Evidence for a batch of requirements, deduplicated by bullet.
 *
 * Returns both the per-requirement mapping and the union of bullets involved,
 * so a prompt can include each bullet's text exactly once and refer to it by id
 * everywhere else.
 */
export function retrieveForRequirements(
  facts: ResumeFacts,
  requirements: readonly string[],
  perRequirement = 4,
): {
  byRequirement: Array<{ requirement: string; bulletIds: string[] }>;
  bullets: ResumeBullet[];
} {
  const index = indexResume(facts);
  const byRequirement: Array<{ requirement: string; bulletIds: string[] }> = [];
  const used = new Map<string, ResumeBullet>();

  for (const requirement of requirements) {
    const hits = retrieveEvidence(index, requirement, perRequirement);
    for (const hit of hits) used.set(hit.bullet.id, hit.bullet);
    byRequirement.push({
      requirement,
      bulletIds: hits.map((hit) => hit.bullet.id),
    });
  }

  // Stable order keeps prompts (and therefore cache behaviour) consistent.
  const bullets = [...used.values()].sort((a, b) =>
    a.id.localeCompare(b.id, undefined, { numeric: true }),
  );

  return { byRequirement, bullets };
}
