import "server-only";

import { GoogleGenAI } from "@google/genai";
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

const DEFAULT_MODELS: Record<ModelTier, string> = {
  deep: "gemini-3.7-flash",
  fast: "gemini-3.1-flash-lite",
};

export function modelFor(tier: ModelTier): string {
  const configured =
    tier === "deep" ? process.env.GEMINI_MODEL_PRO : process.env.GEMINI_MODEL_FLASH;
  return configured?.trim() || DEFAULT_MODELS[tier];
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

function isRetryable(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  // 429 = rate limited, 5xx = transient upstream failure.
  return /\b(429|500|502|503|504)\b|overloaded|unavailable|rate.?limit/i.test(message);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
}: GenerateOptions<T>): Promise<T> {
  const ai = getClient();
  const model = modelFor(tier);

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction,
          temperature,
          responseMimeType: "application/json",
          responseSchema,
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

      // A malformed or non-conforming response is worth retrying — the model
      // is nondeterministic and often gets it right the second time.
      const worthRetrying = error instanceof AiResponseError || isRetryable(error);
      if (!worthRetrying || attempt === maxRetries) break;

      await sleep(600 * 2 ** attempt);
    }
  }

  if (lastError instanceof AiResponseError || lastError instanceof AiNotConfiguredError) {
    throw lastError;
  }
  throw new AiResponseError(
    lastError instanceof Error ? lastError.message : "The AI request failed.",
  );
}
