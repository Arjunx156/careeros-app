import { describe, expect, test } from "vitest";
import { z } from "zod";
import { zodToGemini } from "@/lib/ai/zod-to-gemini";

describe("zodToGemini", () => {
  test("maps primitives", () => {
    expect(zodToGemini(z.string())).toEqual({ type: "STRING" });
    expect(zodToGemini(z.boolean())).toEqual({ type: "BOOLEAN" });
    expect(zodToGemini(z.number())).toEqual({ type: "NUMBER" });
  });

  test("distinguishes integers from floats", () => {
    expect(zodToGemini(z.number().int())).toEqual({ type: "INTEGER" });
  });

  test("maps arrays with their element type", () => {
    expect(zodToGemini(z.array(z.string()))).toEqual({
      type: "ARRAY",
      items: { type: "STRING" },
    });
  });

  test("maps enums to a constrained string", () => {
    expect(zodToGemini(z.enum(["strong", "partial", "missing"]))).toEqual({
      type: "STRING",
      enum: ["strong", "partial", "missing"],
    });
  });

  test("lists non-optional object keys as required", () => {
    const schema = z.object({ a: z.string(), b: z.number().int() });
    expect(zodToGemini(schema)).toEqual({
      type: "OBJECT",
      properties: { a: { type: "STRING" }, b: { type: "INTEGER" } },
      required: ["a", "b"],
    });
  });

  test("omits optional keys from required", () => {
    const schema = z.object({ a: z.string(), b: z.string().optional() });
    const result = zodToGemini(schema) as { required: string[] };
    expect(result.required).toEqual(["a"]);
  });

  test("keeps nullable keys required but marks them nullable", () => {
    const schema = z.object({ a: z.string().nullable() });
    expect(zodToGemini(schema)).toEqual({
      type: "OBJECT",
      properties: { a: { type: "STRING", nullable: true } },
      required: ["a"],
    });
  });

  test("handles nested objects inside arrays", () => {
    const schema = z.object({
      items: z.array(z.object({ label: z.string(), score: z.number().int() })),
    });

    expect(zodToGemini(schema)).toEqual({
      type: "OBJECT",
      properties: {
        items: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: { label: { type: "STRING" }, score: { type: "INTEGER" } },
            required: ["label", "score"],
          },
        },
      },
      required: ["items"],
    });
  });

  test("throws on an unsupported type rather than emitting a wrong schema", () => {
    expect(() => zodToGemini(z.date())).toThrow(/unsupported/i);
  });
});
