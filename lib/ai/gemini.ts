import "server-only";

import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import type { z } from "zod";

/**
 * Single entry point for every AI call in the app.
 *
 * Two tiers, both configured by environment variable rather than hardcoded —
 * Google retires model IDs regularly (the `gemini-1.5-pro` named in the TRD is
 * already gone, and `gemini-2.5-*` now 404s for new keys), so the model must be
 * config, not code.
 *
 *   "deep" — reasoning-heavy stages: scoring, gap analysis, bullets, action plan
 *   "fast" — mechanical stages: keyword extraction, summary generation
 */
export type ModelTier = "deep" | "fast";

/**
 * Model pools, strongest first.
 *
 * The free tier grants 20 requests per day *per model* — a nine-stage analysis
 * against a single model exhausts it in two runs. Because the quota is
 * per-model, falling through to the next model on exhaustion multiplies the
 * daily budget by the size of the pool rather than blocking the user.
 *
 * Ordering is deliberate: the deep tier leads with the most capable models,
 * and the fast tier leads with the cheapest, but both can fall back into the
 * other's models rather than fail outright.
 */
const MODEL_POOLS: Record<ModelTier, readonly string[]> = {
  deep: [
    "gemini-3.7-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-3-flash-preview",
    "gemini-3.1-flash-lite",
  ],
  fast: [
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash-lite",
    "gemini-3-flash-preview",
    "gemini-3.5-flash",
    "gemini-3.6-flash",
  ],
};

/**
 * Models known to be out of quota, and when they become usable again.
 *
 * Kept on globalThis so dev hot-reload does not forget and immediately burn a
 * request rediscovering the same exhaustion.
 */
const globalForQuota = globalThis as unknown as {
  exhaustedModels: Map<string, number> | undefined;
};

function exhausted(): Map<string, number> {
  globalForQuota.exhaustedModels ??= new Map();
  return globalForQuota.exhaustedModels;
}

function isExhausted(model: string): boolean {
  const until = exhausted().get(model);
  if (until === undefined) return false;
  if (Date.now() >= until) {
    exhausted().delete(model);
    return false;
  }
  return true;
}

/**
 * Google tells us when to come back; honour it, or assume the daily window.
 *
 * Exported so the streaming copilot route, which runs its own failover loop
 * rather than going through generateStructured, records exhaustion in the same
 * shared map instead of rediscovering it on every request.
 */
export function markModelExhausted(model: string, message: string): void {
  const retryMatch = message.match(/retry in ([\d.]+)s/i);
  const retryMs = retryMatch ? Number(retryMatch[1]) * 1000 : NaN;

  const backoff =
    Number.isFinite(retryMs) && retryMs > 0
      ? Math.max(retryMs, 60_000)
      : 60 * 60 * 1000;

  exhausted().set(model, Date.now() + backoff);
}

/** Candidate models for a tier: env override first, then the pool, minus exhausted. */
export function modelsFor(tier: ModelTier): string[] {
  const override = (
    tier === "deep" ? process.env.GEMINI_MODEL_PRO : process.env.GEMINI_MODEL_FLASH
  )?.trim();

  const ordered = override
    ? [override, ...MODEL_POOLS[tier].filter((m) => m !== override)]
    : [...MODEL_POOLS[tier]];

  const usable = ordered.filter((model) => !isExhausted(model));

  // If everything is rate-limited, still try the preferred model so the caller
  // gets a real quota error rather than a confusing "no models" failure.
  return usable.length > 0 ? usable : [ordered[0]];
}

export function modelFor(tier: ModelTier): string {
  return modelsFor(tier)[0];
}

export class AiNotConfiguredError extends Error {
  constructor() {
    super(
      "GOOGLE_GENERATIVE_AI_API_KEY is not set. Add it to .env.local — get a key at https://aistudio.google.com/app/apikey",
    );
    this.name = "AiNotConfiguredError";
  }
}

export class AiResponseError extends Error {
  constructor(
    message: string,
    readonly raw?: string,
  ) {
    super(message);
    this.name = "AiResponseError";
  }
}

export function isAiConfigured(): boolean {
  return Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
}

let client: GoogleGenAI | undefined;

function getClient(): GoogleGenAI {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) throw new AiNotConfiguredError();

  client ??= new GoogleGenAI({ apiKey });
  return client;
}

/** Strip markdown fences some models still wrap around JSON. */
function unwrapJson(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return (fenced?.[1] ?? trimmed).trim();
}

/**
 * Quota errors must NOT be retried here.
 *
 * The client also retries, so a server-side retry multiplies out: 3 attempts
 * here × 4 there = 12 requests for a single stage. Against the free tier's
 * per-minute budget that is what *causes* the rate limit rather than surviving
 * it. Quota errors need tens of seconds, which belongs in the client's backoff,
 * not in a tight server loop.
 */
function isQuotaError(message: string): boolean {
  return /exceeded your current quota|RESOURCE_EXHAUSTED|\b429\b/i.test(message);
}

function isRetryable(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  if (isQuotaError(message)) return false;

  // 5xx and transient overload only — a fresh attempt plausibly succeeds.
  return /\b(500|502|503|504)\b|overloaded|unavailable/i.test(message);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Starting with Gemini 3.5, the legacy `thinkingBudget` knob is rejected
 * outright ("will result in a user error if set" — @google/genai's own
 * ReinforcementTuningHyperParameters.thinkingBudget doc) in favor of
 * `thinkingLevel`. The model pools mix pre-3.5 and 3.5+ models, so which
 * field to send has to follow the model actually being called rather than
 * being fixed once — sending the wrong one is a 400 INVALID_ARGUMENT with no
 * further detail, which is exactly what a fixed `thinkingBudget: 0` produced
 * against gemini-3.5-flash/gemini-3.6-flash.
 */
function usesThinkingLevel(model: string): boolean {
  const version = model.match(/gemini-(\d+(?:\.\d+)?)/)?.[1];
  return version !== undefined && parseFloat(version) >= 3.5;
}

function thinkingConfigFor(model: string, thinking: "on" | "off"): Record<string, unknown> {
  if (thinking !== "off") return {};

  return usesThinkingLevel(model)
    ? { thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL } }
    : { thinkingConfig: { thinkingBudget: 0 } };
}

export type GenerateOptions<T> = {
  tier: ModelTier;
  systemInstruction: string;
  prompt: string;
  /** Zod schema the response must satisfy. */
  schema: z.ZodType<T>;
  /** Gemini responseSchema — constrains decoding so output is valid JSON by construction. */
  responseSchema: Record<string, unknown>;
  temperature?: number;
  maxRetries?: number;
  /**
   * Gemini 3 models reason before answering, and those thought tokens are
   * billed as output — a trivial call spent 169 thought tokens against 23 of
   * actual answer. Turn it off for stages that are structured reading rather
   * than reasoning.
   */
  thinking?: "on" | "off";
};

/**
 * Generate structured JSON and validate it.
 *
 * Two layers of safety: Gemini's `responseSchema` constrains the shape during
 * decoding, and Zod re-validates on our side. The second layer matters because
 * a schema-shaped response can still be semantically wrong (out-of-range
 * scores, empty required strings), and downstream code assumes it is not.
 */
export async function generateStructured<T>({
  tier,
  systemInstruction,
  prompt,
  schema,
  responseSchema,
  temperature = 0.3,
  maxRetries = 2,
  thinking = "on",
}: GenerateOptions<T>): Promise<T> {
  const ai = getClient();
  const candidates = modelsFor(tier);

  let lastError: unknown;
  let lastModel: string | undefined;

  /**
   * Ceiling on total requests for one stage.
   *
   * Without it, a systematically malformed response retries maxRetries times
   * against every model in the pool — 15 requests against a 20/day budget, all
   * failing the same way. Quota failover is worth walking the pool for; a
   * schema mismatch is not.
   */
  const MAX_TOTAL_ATTEMPTS = 4;
  let totalAttempts = 0;

  // Outer loop walks the model pool; inner loop retries a single model.
  for (const model of candidates) {
    if (totalAttempts >= MAX_TOTAL_ATTEMPTS) break;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (totalAttempts >= MAX_TOTAL_ATTEMPTS) break;
      totalAttempts += 1;
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            systemInstruction,
            temperature,
            responseMimeType: "application/json",
            responseSchema,
            ...thinkingConfigFor(model, thinking),
          },
        });

        const text = response.text;
        if (!text) {
          throw new AiResponseError("The model returned an empty response.");
        }

        let parsed: unknown;
        try {
          parsed = JSON.parse(unwrapJson(text));
        } catch {
          throw new AiResponseError("The model returned malformed JSON.", text);
        }

        const result = schema.safeParse(parsed);
        if (!result.success) {
          throw new AiResponseError(
            `The model's response did not match the expected shape: ${result.error.issues
              .slice(0, 3)
              .map((issue) => `${issue.path.join(".")} ${issue.message}`)
              .join("; ")}`,
            text,
          );
        }

        return result.data;
      } catch (error) {
        lastError = error;
        lastModel = model;
        const message = error instanceof Error ? error.message : String(error);

        // The client-facing error is deliberately terse (raw Google API
        // text, e.g. "Request contains an invalid argument."), which is
        // useless for telling a bad model name apart from a bad schema apart
        // from a bad prompt. Log which model/attempt actually produced it.
        console.error(
          `[gemini] ${model} (tier=${tier}, attempt=${attempt + 1}/${maxRetries + 1}) failed:`,
          error,
        );

        // Out of daily quota on this model: remember it and move to the next
        // one immediately. Retrying here would waste the retry budget on a
        // model that cannot answer again until tomorrow.
        if (isQuotaError(message)) {
          markModelExhausted(model, message);
          break;
        }

        // A malformed or non-conforming response is worth retrying — the model
        // is nondeterministic and often gets it right the second time.
        const worthRetrying = error instanceof AiResponseError || isRetryable(error);
        if (!worthRetrying || attempt === maxRetries) break;

        await sleep(600 * 2 ** attempt);
      }
    }
  }

  if (lastError instanceof AiNotConfiguredError) throw lastError;

  // Prefix with the model that actually produced this so the compact
  // stage-failure log (which only ever shows this message, not the
  // per-attempt logs above) is self-contained rather than a bare Google
  // error string with no way to tell which model or tier it came from.
  const prefix = lastModel ? `[${lastModel}] ` : "";
  const rawMessage =
    lastError instanceof AiResponseError
      ? lastError.message
      : lastError instanceof Error
        ? lastError.message
        : "The AI request failed.";
  const raw = lastError instanceof AiResponseError ? lastError.raw : undefined;

  throw new AiResponseError(`${prefix}${rawMessage}`, raw);
}
