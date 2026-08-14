/**
 * Client-side driver for the staged analysis pipeline.
 *
 * The server runs one stage per request; this walks the stages until done.
 *
 * Transient failures are retried here rather than surfaced immediately. Gemini
 * routinely answers a burst of nine calls with a 503 "high demand" on one of
 * them, and making a person click "retry" for a hiccup that clears in two
 * seconds is a bad trade. Genuine failures still stop and report.
 */

export type AdvanceResult =
  | { status: "done" }
  | { status: "failed"; stage: number; message: string };

type AdvanceResponse = {
  ok?: boolean;
  error?: string;
  data?: { stage: number; done: boolean };
};

/** Errors worth retrying automatically — the operation may simply succeed next time. */
function isTransient(message: string): boolean {
  return /overloaded|high demand|try again|rate limit|database connection|unavailable|timed out/i.test(
    message,
  );
}

/**
 * A quota error is transient but on a completely different timescale.
 *
 * The free tier's budget is per minute, so retrying after two seconds simply
 * burns another request and fails again. Waiting out the window is the only
 * thing that works.
 */
function isRateLimit(message: string): boolean {
  return /rate limit|quota/i.test(message);
}

const MAX_TRANSIENT_RETRIES = 3;

/** Backoff for a demand spike: 1s, 2s, 4s. */
const OVERLOAD_BACKOFF_MS = [1_000, 2_000, 4_000];

/** Backoff for a per-minute quota: 20s, 40s, 60s. */
const RATE_LIMIT_BACKOFF_MS = [20_000, 40_000, 60_000];

/**
 * Small gap between successful stages.
 *
 * Nine back-to-back calls will trip a per-minute request budget on their own.
 * Spacing them costs a few seconds overall and avoids a failure that costs far
 * more, since recovery means waiting out the whole window.
 */
const INTER_STAGE_PACING_MS = 1_200;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type AdvanceOptions = {
  analysisId: string;
  fromStage: number;
  totalStages: number;
  /** Called before each stage attempt so the UI can show progress. */
  onStage?: (stage: number, attempt: number) => void;
  signal?: AbortSignal;
};

export async function runPipeline({
  analysisId,
  fromStage,
  totalStages,
  onStage,
  signal,
}: AdvanceOptions): Promise<AdvanceResult> {
  let stage = fromStage;
  let transientRetries = 0;

  while (stage < totalStages) {
    if (signal?.aborted) {
      return { status: "failed", stage, message: "Analysis cancelled." };
    }

    onStage?.(stage, transientRetries);

    let payload: AdvanceResponse;
    let ok: boolean;

    try {
      const response = await fetch(`/api/analyses/${analysisId}/advance`, {
        method: "POST",
        signal,
      });
      ok = response.ok;
      payload = (await response.json().catch(() => ({}))) as AdvanceResponse;
    } catch (error) {
      if (signal?.aborted) {
        return { status: "failed", stage, message: "Analysis cancelled." };
      }
      ok = false;
      payload = {
        error:
          error instanceof Error && error.message
            ? error.message
            : "Connection error. Check your internet and try again.",
      };
    }

    if (ok && payload.ok && payload.data) {
      stage = payload.data.stage;
      transientRetries = 0;
      if (payload.data.done) return { status: "done" };

      await sleep(INTER_STAGE_PACING_MS);
      continue;
    }

    const message = payload.error ?? "That step failed.";

    if (isTransient(message) && transientRetries < MAX_TRANSIENT_RETRIES) {
      const schedule = isRateLimit(message)
        ? RATE_LIMIT_BACKOFF_MS
        : OVERLOAD_BACKOFF_MS;

      await sleep(schedule[transientRetries] ?? schedule.at(-1)!);
      transientRetries += 1;
      continue;
    }

    return { status: "failed", stage, message };
  }

  return { status: "done" };
}
