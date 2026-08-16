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
 * numbers, integers, booleans, enums, and optional/nullable wrappers.
 */
export type GeminiSchema = Record<string, unknown>;

type ZodCheckDef = {
  check?: string;
  format?: string;
  /** Present on max_length/min_length (array/string length bounds). */
  maximum?: number;
  minimum?: number;
  /** Present on less_than/greater_than (number range bounds — `.max()`/`.min()`). */
  value?: number;
};

type ZodInternals = {
  type: string;
  shape?: Record<string, z.ZodType>;
  element?: z.ZodType;
  innerType?: z.ZodType;
  entries?: Record<string, string>;
  checks?: Array<{ _zod?: { def?: ZodCheckDef } }>;
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

/** `maxItems`/`minItems` for `.max()`/`.min()` on `z.array()` — Gemini honours both. */
function arrayBounds(def: ZodInternals): GeminiSchema {
  const bounds: GeminiSchema = {};
  for (const check of checkDefs(def)) {
    if (check.check === "max_length" && check.maximum !== undefined) {
      bounds.maxItems = check.maximum;
    }
    if (check.check === "min_length" && check.minimum !== undefined) {
      bounds.minItems = check.minimum;
    }
  }
  return bounds;
}

/** `maximum`/`minimum` for `.max()`/`.min()` on `z.number()` — same reasoning as arrayBounds. */
function numberBounds(def: ZodInternals): GeminiSchema {
  const bounds: GeminiSchema = {};
  for (const check of checkDefs(def)) {
    if (check.check === "less_than" && check.value !== undefined) {
      bounds.maximum = check.value;
    }
    if (check.check === "greater_than" && check.value !== undefined) {
      bounds.minimum = check.value;
    }
  }
  return bounds;
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
        ...arrayBounds(def),
      };

    case "string":
      return { type: "STRING" };

    case "number":
      return { type: isInteger(def) ? "INTEGER" : "NUMBER", ...numberBounds(def) };

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

    default:
      throw new Error(`zodToGemini: unsupported Zod type "${def.type}"`);
  }
}
