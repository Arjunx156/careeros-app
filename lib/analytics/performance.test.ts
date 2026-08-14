import { describe, expect, test } from "vitest";
import {
  MIN_SEGMENT_SIZE,
  aggregateBy,
  applicationsOverTime,
  hasEnoughData,
  humanizeLabel,
  type PerformanceRow,
} from "@/lib/analytics/performance";

function row(overrides: Partial<PerformanceRow> = {}): PerformanceRow {
  return {
    status: "applied",
    resumeName: "BA v1",
    roleCategory: "Business Analyst",
    country: "Ireland",
    method: "direct",
    ...overrides,
  };
}

describe("aggregateBy", () => {
  test("counts applications, interviews and offers per segment", () => {
    const stats = aggregateBy(
      [
        row({ resumeName: "A", status: "applied" }),
        row({ resumeName: "A", status: "interview" }),
        row({ resumeName: "A", status: "offer" }),
      ],
      (r) => r.resumeName,
    );

    expect(stats[0]).toMatchObject({
      label: "A",
      applications: 3,
      interviews: 2,
      offers: 1,
    });
  });

  test("counts final_round and offer as having reached interview", () => {
    const stats = aggregateBy(
      [
        row({ status: "final_round" }),
        row({ status: "offer" }),
        row({ status: "rejected" }),
      ],
      (r) => r.resumeName,
    );
    expect(stats[0].interviews).toBe(2);
  });

  test("excludes wishlist and preparing — those are not attempts", () => {
    const stats = aggregateBy(
      [
        row({ status: "wishlist" }),
        row({ status: "preparing" }),
        row({ status: "applied" }),
      ],
      (r) => r.resumeName,
    );
    expect(stats[0].applications).toBe(1);
  });

  test("suppresses the rate below the minimum segment size", () => {
    const stats = aggregateBy(
      [row({ status: "interview" }), row({ status: "applied" })],
      (r) => r.resumeName,
    );
    // One interview from two applications is not a 50% rate worth reporting.
    expect(stats[0].applications).toBe(2);
    expect(stats[0].interviewRate).toBeNull();
  });

  test("reports the rate once the segment is large enough", () => {
    const rows = Array.from({ length: MIN_SEGMENT_SIZE }, (_, index) =>
      row({ status: index === 0 ? "interview" : "applied" }),
    );
    const stats = aggregateBy(rows, (r) => r.resumeName);
    expect(stats[0].interviewRate).toBe(33);
  });

  test("groups nulls under a labelled bucket rather than dropping them", () => {
    const stats = aggregateBy([row({ resumeName: null })], (r) => r.resumeName);
    expect(stats[0].label).toBe("Not recorded");
  });

  test("sorts by interview rate, with rated segments above unrated ones", () => {
    const rows = [
      ...Array.from({ length: 4 }, () => row({ resumeName: "Strong", status: "interview" })),
      ...Array.from({ length: 4 }, () => row({ resumeName: "Weak", status: "applied" })),
      row({ resumeName: "Tiny", status: "interview" }),
    ];
    const stats = aggregateBy(rows, (r) => r.resumeName);
    expect(stats.map((s) => s.label)).toEqual(["Strong", "Weak", "Tiny"]);
  });

  test("returns nothing for no rows", () => {
    expect(aggregateBy([], (r) => r.resumeName)).toEqual([]);
  });
});

describe("applicationsOverTime", () => {
  test("returns one point per month requested", () => {
    expect(applicationsOverTime([], 6)).toHaveLength(6);
  });

  test("includes months with no activity rather than skipping them", () => {
    const points = applicationsOverTime([], 3);
    expect(points.every((point) => point.applications === 0)).toBe(true);
  });

  test("counts an application into its own month", () => {
    const now = new Date();
    const points = applicationsOverTime([{ date: now, status: "applied" }], 3);
    expect(points.at(-1)?.applications).toBe(1);
  });

  test("counts interviews separately from applications", () => {
    const now = new Date();
    const points = applicationsOverTime(
      [
        { date: now, status: "interview" },
        { date: now, status: "applied" },
      ],
      2,
    );
    expect(points.at(-1)).toMatchObject({ applications: 2, interviews: 1 });
  });

  test("months run oldest to newest", () => {
    const points = applicationsOverTime([], 4);
    const sorted = [...points].sort((a, b) => a.month.localeCompare(b.month));
    expect(points.map((p) => p.month)).toEqual(sorted.map((p) => p.month));
  });
});

describe("hasEnoughData", () => {
  test("false below five submitted applications", () => {
    expect(hasEnoughData(Array.from({ length: 4 }, () => row()))).toBe(false);
  });

  test("true at five", () => {
    expect(hasEnoughData(Array.from({ length: 5 }, () => row()))).toBe(true);
  });

  test("does not count wishlist rows toward the threshold", () => {
    expect(hasEnoughData(Array.from({ length: 8 }, () => row({ status: "wishlist" })))).toBe(
      false,
    );
  });
});

describe("humanizeLabel", () => {
  test("turns an enum value into readable text", () => {
    expect(humanizeLabel("job_board")).toBe("Job Board");
  });

  test("special-cases LinkedIn's capitalization", () => {
    expect(humanizeLabel("linkedin")).toBe("LinkedIn");
  });

  test("leaves an already-readable label alone", () => {
    expect(humanizeLabel("Business Analyst")).toBe("Business Analyst");
  });

  test("aggregation applies it to segment labels", () => {
    const stats = aggregateBy([row({ method: "job_board" })], (r) => r.method);
    expect(stats[0].label).toBe("Job Board");
  });
});
