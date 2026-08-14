import { describe, expect, test } from "vitest";
import { describeStageError } from "@/lib/api/errors";
import { AiNotConfiguredError } from "@/lib/ai/gemini";

describe("describeStageError", () => {
  test("unwraps a Google 503 envelope into its human message", () => {
    const error = new Error(
      '{"error":{"code":503,"message":"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.","status":"UNAVAILABLE"}}',
    );
    expect(describeStageError(error)).toBe(
      "Gemini is overloaded right now. Wait a moment and retry this step — nothing before it was lost.",
    );
  });

  test("recognizes a free-tier quota error", () => {
    const error = new Error(
      '{"error":{"code":429,"message":"You exceeded your current quota, please check your plan and billing details.","status":"RESOURCE_EXHAUSTED"}}',
    );
    expect(describeStageError(error)).toMatch(/rate limit reached on the free tier/i);
  });

  test("recognizes database connection exhaustion", () => {
    const error = new Error(
      "Too many database connections opened: Failed to acquire permit to connect to the database.",
    );
    expect(describeStageError(error)).toMatch(/Lost the database connection/i);
  });

  test("handles an ErrorEvent-shaped rejection with no message", () => {
    // The Neon driver rejects with this shape; String(error) yields "[object Object]".
    const errorEvent = { type: "error", defaultPrevented: false };
    expect(describeStageError(errorEvent)).toBe(
      "This step failed for an unknown reason. Retry — everything before it is saved.",
    );
  });

  test("passes through the configuration error verbatim", () => {
    expect(describeStageError(new AiNotConfiguredError())).toMatch(
      /GOOGLE_GENERATIVE_AI_API_KEY is not set/,
    );
  });

  test("keeps a plain message that needs no translation", () => {
    expect(describeStageError(new Error("The resume has no extractable text."))).toBe(
      "The resume has no extractable text.",
    );
  });

  test("handles a bare string rejection", () => {
    expect(describeStageError("something broke")).toBe("something broke");
  });

  test("falls back cleanly on null", () => {
    expect(describeStageError(null)).toMatch(/unknown reason/i);
  });

  test("does not crash on a malformed JSON envelope", () => {
    const error = new Error('{"error":{"code":503,"message":');
    expect(typeof describeStageError(error)).toBe("string");
  });
});

describe("describeStageError — message length", () => {
  test("keeps a Prisma error to its diagnosis, not the whole echoed query", () => {
    const prismaError = new Error(
      "\nInvalid `prisma.analysis.update()` invocation:\n\n{\n  where: { id: \"abc\" },\n  data: {\n" +
        "    someField: \"x\",\n".repeat(200) +
        "  }\n}\n\nUnknown argument `stageData`.",
    );
    const result = describeStageError(prismaError);
    expect(result.length).toBeLessThanOrEqual(301);
    expect(result).toContain("Invalid");
  });

  test("leaves a short message untouched", () => {
    expect(describeStageError(new Error("The resume has no extractable text."))).toBe(
      "The resume has no extractable text.",
    );
  });
});
