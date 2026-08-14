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

describe("wrapper types", () => {
  test("unwraps .default() to its inner type", () => {
    const schema = z.object({ name: z.string().default("") });
    expect(zodToGemini(schema)).toMatchObject({
      type: "OBJECT",
      properties: { name: { type: "STRING" } },
    });
  });

  test("unwraps an array with a default", () => {
    const schema = z.object({ ids: z.array(z.string()).default([]) });
    expect(zodToGemini(schema)).toMatchObject({
      properties: { ids: { type: "ARRAY", items: { type: "STRING" } } },
    });
  });

  test("keeps a defaulted field required so the model answers it", () => {
    const schema = z.object({ role: z.string().default("") });
    expect((zodToGemini(schema) as { required: string[] }).required).toContain("role");
  });

  test("handles a default nested inside an object inside an array", () => {
    const schema = z.object({
      items: z.array(z.object({ tags: z.array(z.string()).default([]) })),
    });
    expect(() => zodToGemini(schema)).not.toThrow();
  });
});

describe("evidence id pattern", () => {
  test("accepts bullet, summary and skills ids", () => {
    const id = z.string().regex(/^[bsk]\d+$/);
    for (const value of ["b1", "b12", "s1", "k1"]) {
      expect(id.safeParse(value).success).toBe(true);
    }
  });

  test("rejects a malformed id", () => {
    const id = z.string().regex(/^[bsk]\d+$/);
    for (const value of ["x1", "bullet1", "b", "1"]) {
      expect(id.safeParse(value).success).toBe(false);
    }
  });
});
