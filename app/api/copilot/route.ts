import type { NextRequest } from "next/server";
import { z } from "zod";
import { GoogleGenAI } from "@google/genai";
import { apiError, apiValidationError, handleRoute } from "@/lib/api/response";
import { describeStageError } from "@/lib/api/errors";
import { isAiConfigured, modelsFor } from "@/lib/ai/gemini";
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

    const [model] = modelsFor("deep");

    try {
      const stream = await ai.models.generateContentStream({
        model,
        contents: parsed.data.messages.map((message) => ({
          role: message.role,
          parts: [{ text: message.content }],
        })),
        config: {
          systemInstruction: `${COPILOT_SYSTEM}\n\n# THE USER'S DATA\n\n${context}`,
          temperature: 0.4,
        },
      });

      const encoder = new TextEncoder();
      const body = new ReadableStream<Uint8Array>({
        async start(controller) {
          try {
            for await (const chunk of stream) {
              const text = chunk.text;
              if (text) controller.enqueue(encoder.encode(text));
            }
          } catch (error) {
            // The stream has already started, so the status is sent. Append the
            // failure as text rather than leaving the answer truncated with no
            // explanation.
            console.error("[copilot] stream failed:", error);
            controller.enqueue(
              encoder.encode(`\n\n[${describeStageError(error)}]`),
            );
          } finally {
            controller.close();
          }
        },
      });

      return new Response(body, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store",
          "X-Accel-Buffering": "no",
        },
      });
    } catch (error) {
      console.error("[copilot] request failed:", error);
      return apiError(describeStageError(error), 502);
    }
  });
}
