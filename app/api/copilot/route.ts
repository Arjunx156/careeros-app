import type { NextRequest } from "next/server";
import { z } from "zod";
import { GoogleGenAI } from "@google/genai";
import { apiError, apiValidationError, handleRoute } from "@/lib/api/response";
import { describeStageError } from "@/lib/api/errors";
import { isAiConfigured, markModelExhausted, modelsFor } from "@/lib/ai/gemini";
import { COPILOT_SYSTEM, buildCopilotContext } from "@/lib/copilot/context";

export const maxDuration = 60;

const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "model"]),
        content: z.string().min(1).max(4000),
      }),
    )
    .min(1)
    .max(24),
});

function isQuotaOrOverload(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /quota|RESOURCE_EXHAUSTED|\b429\b|\b503\b|overloaded|unavailable|high demand/i.test(
    message,
  );
}

/**
 * Streaming chat.
 *
 * Streamed rather than returned whole because an answer grounded in the whole
 * search history takes several seconds to produce, and watching it arrive is
 * the difference between "thinking" and "broken".
 */
export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    if (!isAiConfigured()) {
      return apiError(
        "GOOGLE_GENERATIVE_AI_API_KEY is not set, so the copilot cannot answer.",
        503,
      );
    }

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) return apiValidationError(parsed.error);

    const context = await buildCopilotContext();
    const ai = new GoogleGenAI({
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
    });

    const contents = parsed.data.messages.map((message) => ({
      role: message.role,
      parts: [{ text: message.content }],
    }));

    const config = {
      systemInstruction: `${COPILOT_SYSTEM}\n\n# THE USER'S DATA\n\n${context}`,
      temperature: 0.4,
    };

    /**
     * Walk the model pool exactly as generateStructured does.
     *
     * The free tier allows 20 requests per day *per model*, so a single
     * exhausted model must not take the whole copilot down while four others
     * still have budget. This route previously took modelsFor()[0] and gave up.
     */
    const candidates = modelsFor("deep");
    let lastError: unknown;

    for (const model of candidates) {
      try {
        const stream = await ai.models.generateContentStream({
          model,
          contents,
          config,
        });

        // Pull the first chunk before committing to a 200. If the model is out
        // of quota the failure surfaces here, while we can still fail over —
        // once bytes are sent the status is locked in.
        const iterator = stream[Symbol.asyncIterator]();
        const first = await iterator.next();

        const encoder = new TextEncoder();
        const body = new ReadableStream<Uint8Array>({
          async start(controller) {
            try {
              if (!first.done && first.value?.text) {
                controller.enqueue(encoder.encode(first.value.text));
              }

              while (true) {
                const next = await iterator.next();
                if (next.done) break;
                const text = next.value?.text;
                if (text) controller.enqueue(encoder.encode(text));
              }
            } catch (error) {
              // Mid-stream failure: the status is already sent, so append the
              // reason rather than leaving the answer truncated and unexplained.
              console.error("[copilot] stream failed:", error);
              controller.enqueue(encoder.encode(`\n\n[${describeStageError(error)}]`));
            } finally {
              controller.close();
            }
          },
        });

        return new Response(body, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-store",
            "X-Copilot-Model": model,
            "X-Accel-Buffering": "no",
          },
        });
      } catch (error) {
        lastError = error;

        if (isQuotaOrOverload(error)) {
          const message = error instanceof Error ? error.message : String(error);
          markModelExhausted(model, message);
          console.warn(`[copilot] ${model} unavailable, trying next model`);
          continue;
        }

        break;
      }
    }

    console.error("[copilot] all models failed:", lastError);
    return apiError(describeStageError(lastError), 502);
  });
}
