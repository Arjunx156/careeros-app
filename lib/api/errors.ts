import { AiNotConfiguredError } from "@/lib/ai/gemini";

/**
 * Turn a thrown value into something worth showing a person.
 *
 * Three kinds of noise get cleaned up here:
 *
 *   1. Google returns its errors as a raw JSON envelope, so the message
 *      surfaced as `{"error":{"code":503,"message":"..."}}` on screen.
 *   2. The Neon driver rejects with a DOM-style `ErrorEvent` that has no
 *      `message` at all — `String(error)` gives "[object Object]".
 *   3. Connection-pool exhaustion reads as a generic failure, when the useful
 *      thing to say is "wait a moment and retry".
 */

/** Pull `.error.message` out of a Google API error envelope. */
function unwrapGoogleError(message: string): string | null {
  const start = message.indexOf("{");
  if (start === -1) return null;

  try {
    const parsed = JSON.parse(message.slice(start)) as {
      error?: { message?: string; status?: string };
    };
    return parsed.error?.message ?? null;
  } catch {
    return null;
  }
}

function isConnectionError(text: string): boolean {
  return /too many database connection|connection pool|acquire permit|ECONNRESET|ETIMEDOUT|Connection terminated|socket hang up/i.test(
    text,
  );
}

function isOverloadedError(text: string): boolean {
  return /high demand|overloaded|UNAVAILABLE|\b503\b|currently experiencing/i.test(
    text,
  );
}

function isRateLimitError(text: string): boolean {
  return /exceeded your current quota|RESOURCE_EXHAUSTED|\b429\b|rate.?limit/i.test(
    text,
  );
}

export function describeStageError(error: unknown): string {
  if (error instanceof AiNotConfiguredError) return error.message;

  // ErrorEvent and similar non-Error rejections may carry no message at all.
  // Only a real message is eligible to be shown; a field like `type: "error"`
  // would otherwise reach the user as the single word "error".
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : typeof (error as { message?: unknown })?.message === "string"
          ? ((error as { message: string }).message)
          : "";

  const friendly = unwrapGoogleError(raw) ?? raw;

  // Classification may still consult the whole object — an ErrorEvent from the
  // database driver identifies itself in fields we would never display.
  let serialized = "";
  try {
    serialized = typeof error === "object" && error !== null ? JSON.stringify(error) : "";
  } catch {
    serialized = "";
  }
  const haystack = `${friendly} ${raw} ${serialized}`;

  if (isConnectionError(haystack)) {
    return "Lost the database connection. Wait a few seconds and retry — your finished steps are saved.";
  }

  if (isOverloadedError(haystack)) {
    return "Gemini is overloaded right now. Wait a moment and retry this step — nothing before it was lost.";
  }

  if (isRateLimitError(haystack)) {
    return "Gemini rate limit reached on the free tier. Wait a minute, then retry this step.";
  }

  if (friendly.trim().length > 0) return truncate(friendly);

  return "This step failed for an unknown reason. Retry — everything before it is saved.";
}

/**
 * Prisma echoes the entire failing query back in its error — hundreds of lines
 * of JSON. Useful in a server log, useless in a toast. Keep the first line,
 * which carries the actual diagnosis.
 */
const MAX_ERROR_CHARS = 300;

function truncate(message: string): string {
  const firstMeaningfulLine =
    message
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line.length > 0 && !line.startsWith("{")) ?? message;

  const candidate =
    firstMeaningfulLine.length < 40 ? message.replace(/\s+/g, " ") : firstMeaningfulLine;

  return candidate.length > MAX_ERROR_CHARS
    ? `${candidate.slice(0, MAX_ERROR_CHARS).trimEnd()}…`
    : candidate;
}
