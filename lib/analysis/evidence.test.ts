import { describe, expect, test } from "vitest";
import { parseResumeFacts } from "@/lib/analysis/facts";
import {
  allowedQuantitiesFor,
  redactFabricatedNumbers,
  validateClaims,
} from "@/lib/analysis/evidence";
import { averageBulletScore } from "@/lib/analysis/types";

const RESUME = `EXPERIENCE
Business Analyst — Acme Payments (2023-Present)
• Gathered requirements across 3 product teams, documenting 40+ user stories in Jira.
• Built Power BI dashboards tracking 12 KPIs, cutting reporting from 5 days to 3.`;

const facts = parseResumeFacts(RESUME);

type Claim = {
  requirement: string;
  reasoning: string;
  supportingBulletIds: string[];
  unsupported?: boolean;
};

const textOf = (claim: Claim) => claim.reasoning;

describe("validateClaims — citation checking", () => {
  test("keeps a claim that cites a real bullet", () => {
    const { claims, report } = validateClaims<Claim>(
      [{ requirement: "SQL", reasoning: "Shown in dashboards work.", supportingBulletIds: ["b1"] }],
      textOf,
      facts,
    );
    expect(claims[0].unsupported).toBe(false);
    expect(claims[0].supportingBulletIds).toEqual(["b1"]);
    expect(report.unsupportedClaims).toBe(0);
  });

  test("drops a citation to a bullet that does not exist", () => {
    const { claims, report } = validateClaims<Claim>(
      [{ requirement: "Kubernetes", reasoning: "Clearly demonstrated.", supportingBulletIds: ["b99"] }],
      textOf,
      facts,
    );
    expect(claims[0].supportingBulletIds).toEqual([]);
    expect(report.invalidCitations).toEqual(["b99"]);
  });

  test("marks a claim unsupported once all its citations are invalid", () => {
    const { claims } = validateClaims<Claim>(
      [{ requirement: "Kubernetes", reasoning: "Strong experience.", supportingBulletIds: ["b99", "b100"] }],
      textOf,
      facts,
    );
    // This is the core protection: an invented claim cannot present as fact.
    expect(claims[0].unsupported).toBe(true);
  });

  test("keeps the valid subset when a claim mixes real and invented citations", () => {
    const { claims } = validateClaims<Claim>(
      [{ requirement: "Reporting", reasoning: "Built dashboards.", supportingBulletIds: ["b2", "b77"] }],
      textOf,
      facts,
    );
    expect(claims[0].supportingBulletIds).toEqual(["b2"]);
    expect(claims[0].unsupported).toBe(false);
  });

  test("overrides a model that claims support while citing nothing", () => {
    const { claims } = validateClaims<Claim>(
      [{ requirement: "SQL", reasoning: "Obviously qualified.", supportingBulletIds: [], unsupported: false }],
      textOf,
      facts,
    );
    expect(claims[0].unsupported).toBe(true);
  });

  test("counts unsupported claims across a batch", () => {
    const { report } = validateClaims<Claim>(
      [
        { requirement: "A", reasoning: "x", supportingBulletIds: ["b1"] },
        { requirement: "B", reasoning: "x", supportingBulletIds: ["b99"] },
        { requirement: "C", reasoning: "x", supportingBulletIds: [] },
      ],
      textOf,
      facts,
    );
    expect(report.totalClaims).toBe(3);
    expect(report.unsupportedClaims).toBe(2);
  });
});

describe("validateClaims — number checking", () => {
  test("accepts a figure that appears in the resume", () => {
    const { report } = validateClaims<Claim>(
      [{ requirement: "Reporting", reasoning: "Tracked 12 KPIs.", supportingBulletIds: ["b2"] }],
      textOf,
      facts,
    );
    expect(report.fabricatedNumbers).toEqual([]);
  });

  test("flags a figure that appears nowhere", () => {
    const { report } = validateClaims<Claim>(
      [{ requirement: "Reporting", reasoning: "Improved efficiency by 87%.", supportingBulletIds: ["b2"] }],
      textOf,
      facts,
    );
    expect(report.fabricatedNumbers).toEqual(["87"]);
  });

  test("accepts a year drawn from a date range", () => {
    const { report } = validateClaims<Claim>(
      [{ requirement: "Tenure", reasoning: "Since 2023.", supportingBulletIds: ["b1"] }],
      textOf,
      facts,
    );
    expect(report.fabricatedNumbers).toEqual([]);
  });
});

describe("redactFabricatedNumbers", () => {
  const allowed = allowedQuantitiesFor(facts);

  test("replaces an invented figure with a placeholder", () => {
    const result = redactFabricatedNumbers("Cut costs by 87%", allowed);
    expect(result.text).toBe("Cut costs by X%");
    expect(result.redacted).toEqual(["87"]);
  });

  test("leaves real figures untouched", () => {
    const result = redactFabricatedNumbers("Tracked 12 KPIs across 3 teams", allowed);
    expect(result.text).toBe("Tracked 12 KPIs across 3 teams");
    expect(result.redacted).toEqual([]);
  });

  test("redacts only the invented figure in a mixed sentence", () => {
    const result = redactFabricatedNumbers("Tracked 12 KPIs, saving 87 hours", allowed);
    expect(result.text).toBe("Tracked 12 KPIs, saving X hours");
  });

  test("accepts a figure the resume states with a plus sign", () => {
    // The resume says "40+ user stories", so 40 is real evidence, not invention.
    const result = redactFabricatedNumbers("Documented 40 user stories", allowed);
    expect(result.redacted).toEqual([]);
  });

  test("matches across thousands formatting", () => {
    const withBig = parseResumeFacts("• Analysed 50,000 users in the funnel.");
    const result = redactFabricatedNumbers(
      "Analysed 50000 users",
      allowedQuantitiesFor(withBig),
    );
    expect(result.redacted).toEqual([]);
  });
});

describe("averageBulletScore", () => {
  const base = {
    original: "x",
    clarity: 80,
    impact: 60,
    relevance: 70,
    starStructure: 50,
    issues: [],
    suggested: "y",
    whatChanged: "z",
  };

  test("averages the four scored dimensions", () => {
    expect(averageBulletScore(base)).toBe(65);
  });

  test("ignores fields the schema no longer produces", () => {
    // Older rows may carry extra keys; newer ones may lack some. Neither
    // should produce NaN in the UI.
    const legacy = { ...base, quantification: 40 } as never;
    expect(averageBulletScore(legacy)).toBe(65);
  });

  test("returns null rather than NaN when no scores are present", () => {
    const empty = { original: "x", issues: [], suggested: "y", whatChanged: "z" } as never;
    expect(averageBulletScore(empty)).toBeNull();
  });

  test("averages the subset that is present", () => {
    const partial = { ...base, starStructure: undefined } as never;
    expect(averageBulletScore(partial)).toBe(70);
  });
});
