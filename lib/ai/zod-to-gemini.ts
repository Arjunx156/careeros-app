import { z } from "zod";

/**
 * Convert a Zod schema into a Gemini `responseSchema`.
 *
 * Gemini can constrain decoding to a schema, which makes malformed JSON almost
 * impossible. Writing that schema by hand alongside the Zod one means two
 * definitions that silently drift apart; deriving it removes that whole class
 * of bug.
 *
 * Supports the subset the analysis pipeline uses: objects, arrays, strings,
 * numbers, integers, booleans, enums, and optional/nullable/transform wrappers.
 *
 * DELIBERATELY OMITS size and range constraints (`maxItems`, `minItems`,
 * `maximum`, `minimum`), even though Gemini accepts them on small schemas.
 * They count against a complexity budget on `responseSchema`, and on the
 * larger schemas here that budget is already tight: emitting them made both
 * the judgment stage and the resume optimizer fail 100% of the time with a
 * bare 400 INVALID_ARGUMENT and no indication of the cause. Verified by
 * sending the same two schemas with and without those keywords — identical
 * apart from the constraints, failing with and succeeding without, on two
 * independent models.
 *
 * Bound array length with `cappedArray` in the Zod schema instead: it trims
 * surplus items on our side, which costs no schema budget and beats
 * discarding a whole expensive response over one extra item.
 */
export type GeminiSchema = Record<string, unknown>;

type ZodCheckDef = {
  check?: string;
  format?: string;
};

type ZodInternals = {
  type: string;
  shape?: Record<string, z.ZodType>;
  element?: z.ZodType;
  innerType?: z.ZodType;
  entries?: Record<string, string>;
  checks?: Array<{ _zod?: { def?: ZodCheckDef } }>;
  /** `pipe` (a `.transform()`): `in` is the shape the model must produce. */
  in?: z.ZodType;
};

function internals(schema: z.ZodType): ZodInternals {
  return (schema as unknown as { _def: ZodInternals })._def;
}

function checkDefs(def: ZodInternals): ZodCheckDef[] {
  return def.checks?.map((check) => check._zod?.def).filter((d) => d !== undefined) ?? [];
}

function isInteger(def: ZodInternals): boolean {
  return checkDefs(def).some(
    (check) => check.format === "safeint" || check.check === "int",
  );
}

export function zodToGemini(schema: z.ZodType): GeminiSchema {
  const def = internals(schema);

  switch (def.type) {
    case "object": {
      const shape = def.shape ?? {};
      const properties: Record<string, GeminiSchema> = {};
      const required: string[] = [];

      for (const [key, value] of Object.entries(shape)) {
        properties[key] = zodToGemini(value);

        // Optional means "may be absent"; nullable still requires the key.
        if (internals(value).type !== "optional") required.push(key);
      }

      return {
        type: "OBJECT",
        properties,
        ...(required.length > 0 ? { required } : {}),
      };
    }

    case "array":
      return {
        type: "ARRAY",
        items: def.element ? zodToGemini(def.element) : { type: "STRING" },
      };

    case "string":
      return { type: "STRING" };

    case "number":
      return { type: isInteger(def) ? "INTEGER" : "NUMBER" };

    case "boolean":
      return { type: "BOOLEAN" };

    case "enum":
      return { type: "STRING", enum: Object.values(def.entries ?? {}) };

    case "optional":
      return def.innerType ? zodToGemini(def.innerType) : { type: "STRING" };

    // A default applies when the model omits the key, so the wire schema is
    // just the inner type. Treated as required so the model is nudged to
    // answer rather than relying on our fallback.
    case "default":
    case "prefault":
    case "catch":
      return def.innerType ? zodToGemini(def.innerType) : { type: "STRING" };

    case "nullable": {
      const inner = def.innerType ? zodToGemini(def.innerType) : { type: "STRING" };
      return { ...inner, nullable: true };
    }

    // A `.transform()` (how `cappedArray` trims surplus items). The model
    // produces the input side; the transform runs after parsing, on our side,
    // so the wire schema is `in` — never the transformed output.
    case "pipe":
      return def.in ? zodToGemini(def.in) : { type: "STRING" };

    default:
      throw new Error(`zodToGemini: unsupported Zod type "${def.type}"`);
  }
}

/**
 * An array with a soft cap: surplus items are trimmed, not rejected.
 *
 * The counterpart to this module's refusal to emit `maxItems` (see above).
 * `z.array(x).max(n)` would fail the whole parse when a model returns n+1
 * items, discarding a response that cost a request against a small daily
 * quota and was otherwise perfectly good — that is how the JD extraction
 * stage broke when a model returned 11 responsibilities against a cap of 10.
 * The cap exists to keep lists presentable, not to police correctness, so
 * trimming is the honest behaviour.
 */
export function cappedArray<T extends z.ZodType>(
  item: T,
  max: number,
): z.ZodType<z.output<T>[], z.input<T>[]> {
  return z.array(item).transform((items) => items.slice(0, max)) as unknown as z.ZodType<
    z.output<T>[],
    z.input<T>[]
  >;
}
