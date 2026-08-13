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

type ZodInternals = {
  type: string;
  shape?: Record<string, z.ZodType>;
  element?: z.ZodType;
  innerType?: z.ZodType;
  entries?: Record<string, string>;
  checks?: Array<{ _zod?: { def?: { check?: string; format?: string } } }>;
};

function internals(schema: z.ZodType): ZodInternals {
  return (schema as unknown as { _def: ZodInternals })._def;
}

function isInteger(def: ZodInternals): boolean {
  return (
    def.checks?.some((check) => {
      const inner = check._zod?.def;
      return inner?.format === "safeint" || inner?.check === "int";
    }) ?? false
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

    case "nullable": {
      const inner = def.innerType ? zodToGemini(def.innerType) : { type: "STRING" };
      return { ...inner, nullable: true };
    }

    default:
      throw new Error(`zodToGemini: unsupported Zod type "${def.type}"`);
  }
}
