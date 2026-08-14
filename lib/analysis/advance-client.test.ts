import { afterEach, describe, expect, test, vi } from "vitest";
import { runPipeline } from "@/lib/analysis/advance-client";

function mockFetchSequence(
  responses: Array<{ ok: boolean; body: Record<string, unknown> }>,
) {
  let call = 0;
  const spy = vi.fn(async () => {
    const next = responses[Math.min(call, responses.length - 1)];
    call += 1;
    return {
      ok: next.ok,
      json: async () => next.body,
    } as Response;
  });
  vi.stubGlobal("fetch", spy);
  return spy;
}

const success = (stage: number, done = false) => ({
  ok: true,
  body: { ok: true, data: { stage, done } },
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("runPipeline", () => {
  test("walks every stage to completion", async () => {
    const fetchSpy = mockFetchSequence([
      success(1),
      success(2),
      success(3, true),
    ]);

    const result = await runPipeline({
      analysisId: "a1",
      fromStage: 0,
      totalStages: 3,
    });

    expect(result).toEqual({ status: "done" });
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });

  test("resumes from a partial stage rather than restarting", async () => {
    const fetchSpy = mockFetchSequence([success(9, true)]);

    const result = await runPipeline({
      analysisId: "a1",
      fromStage: 8,
      totalStages: 9,
    });

    expect(result).toEqual({ status: "done" });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  test("retries a transient overload and then succeeds", async () => {
    vi.useFakeTimers();
    const fetchSpy = mockFetchSequence([
      { ok: false, body: { ok: false, error: "Gemini is overloaded right now." } },
      success(1, true),
    ]);

    const promise = runPipeline({
      analysisId: "a1",
      fromStage: 0,
      totalStages: 1,
    });
    await vi.runAllTimersAsync();

    expect(await promise).toEqual({ status: "done" });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  test("gives up after the retry budget and reports the stage that failed", async () => {
    vi.useFakeTimers();
    mockFetchSequence([
      { ok: false, body: { ok: false, error: "Gemini is overloaded right now." } },
    ]);

    const promise = runPipeline({
      analysisId: "a1",
      fromStage: 2,
      totalStages: 9,
    });
    await vi.runAllTimersAsync();

    const result = await promise;
    expect(result.status).toBe("failed");
    expect(result).toMatchObject({ stage: 2 });
  });

  test("does not retry a non-transient failure", async () => {
    const fetchSpy = mockFetchSequence([
      { ok: false, body: { ok: false, error: "The resume has no extractable text." } },
    ]);

    const result = await runPipeline({
      analysisId: "a1",
      fromStage: 0,
      totalStages: 9,
    });

    expect(result).toEqual({
      status: "failed",
      stage: 0,
      message: "The resume has no extractable text.",
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  test("reports progress for each stage attempted", async () => {
    mockFetchSequence([success(1), success(2, true)]);
    const seen: number[] = [];

    await runPipeline({
      analysisId: "a1",
      fromStage: 0,
      totalStages: 2,
      onStage: (stage) => seen.push(stage),
    });

    expect(seen).toEqual([0, 1]);
  });
});

describe("runPipeline backoff", () => {
  test("waits far longer for a quota error than a demand spike", async () => {
    vi.useFakeTimers();
    const waits: number[] = [];
    const realSetTimeout = globalThis.setTimeout;
    vi.stubGlobal("setTimeout", ((fn: () => void, ms?: number) => {
      if (ms && ms >= 1000) waits.push(ms);
      return realSetTimeout(fn, 0);
    }) as typeof setTimeout);

    mockFetchSequence([
      { ok: false, body: { ok: false, error: "Gemini rate limit reached on the free tier." } },
    ]);

    const promise = runPipeline({ analysisId: "a1", fromStage: 0, totalStages: 9 });
    await vi.runAllTimersAsync();
    await promise;

    // Quota backoff must be on the order of tens of seconds, not one or two.
    expect(waits[0]).toBeGreaterThanOrEqual(20_000);
  });

  test("paces successful stages so nine calls do not trip a per-minute budget", async () => {
    vi.useFakeTimers();
    const waits: number[] = [];
    const realSetTimeout = globalThis.setTimeout;
    vi.stubGlobal("setTimeout", ((fn: () => void, ms?: number) => {
      if (ms) waits.push(ms);
      return realSetTimeout(fn, 0);
    }) as typeof setTimeout);

    mockFetchSequence([success(1), success(2), success(3, true)]);

    const promise = runPipeline({ analysisId: "a1", fromStage: 0, totalStages: 3 });
    await vi.runAllTimersAsync();
    await promise;

    // Two gaps between three stages; none after the final one.
    expect(waits.filter((w) => w > 0 && w < 5_000)).toHaveLength(2);
  });
});
