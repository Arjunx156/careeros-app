import { describe, expect, test } from "vitest";
import {
  analyzeAts,
  analyzeKeywords,
  analyzeReadability,
  containsTerm,
  countOccurrences,
  normalize,
  quantificationRate,
} from "@/lib/analysis/deterministic";
import { parseResumeFacts } from "@/lib/analysis/facts";

const GOOD_RESUME = `Arjun Krishnan
arjun@example.com

PROFESSIONAL SUMMARY
Business analyst with 2 years of experience.

EXPERIENCE
Business Analyst — Acme Payments (2023-Present)
• Gathered requirements across 3 product teams, documenting 40+ user stories in Jira.
• Built Power BI dashboards tracking 12 KPIs, cutting reporting from 5 days to 3.

SKILLS
SQL, Python, Power BI, Jira

EDUCATION
MSc Business Analytics, 2022`;

const WEAK_RESUME = `Jane Doe

WORK
Analyst at Company
• Responsible for various reporting tasks and other duties as assigned by management.
• Worked on dashboards.`;

describe("normalize / containsTerm", () => {
  test("matches a term regardless of case and punctuation", () => {
    expect(containsTerm("Built Power BI dashboards.", "power bi")).toBe(true);
  });

  test("matches singular against plural via stemming", () => {
    expect(containsTerm("Built dashboards", "dashboard")).toBe(true);
  });

  test("matches a multi-word term only as a phrase", () => {
    expect(containsTerm("stakeholder management skills", "stakeholder management")).toBe(true);
    expect(containsTerm("managed stakeholder relations", "stakeholder management")).toBe(false);
  });

  test("does not match a term that is absent", () => {
    expect(containsTerm("SQL and Python", "kubernetes")).toBe(false);
  });

  test("does not match a substring inside an unrelated word", () => {
    // "R" must not match inside "Requirements".
    expect(containsTerm("Requirements gathering", "R")).toBe(false);
  });

  test("normalize collapses whitespace and strips punctuation", () => {
    expect(normalize("  Power  BI,  dashboards! ")).toBe("power bi dashboards");
  });
});

describe("countOccurrences", () => {
  test("counts repeated phrases", () => {
    expect(countOccurrences("responsible for x. responsible for y.", "responsible for")).toBe(2);
  });

  test("counts word-stem variants", () => {
    expect(countOccurrences("report, reporting, reports", "report")).toBe(3);
  });

  test("returns zero when absent", () => {
    expect(countOccurrences("SQL", "python")).toBe(0);
  });
});

describe("analyzeKeywords", () => {
  test("splits JD terms into present and missing", () => {
    const result = analyzeKeywords(
      ["SQL", "Power BI", "Kubernetes", "stakeholder"],
      GOOD_RESUME,
    );
    expect(result.present).toEqual(expect.arrayContaining(["SQL", "Power BI"]));
    expect(result.missing).toContain("Kubernetes");
  });

  test("flags filler phrases as overused", () => {
    const result = analyzeKeywords([], WEAK_RESUME + " responsible for more things");
    expect(result.overused).toContain("responsible for");
  });

  test("is deterministic across repeated runs", () => {
    const terms = ["SQL", "Python", "Kubernetes"];
    const a = analyzeKeywords(terms, GOOD_RESUME);
    const b = analyzeKeywords(terms, GOOD_RESUME);
    expect(a).toEqual(b);
  });

  test("ignores blank terms", () => {
    const result = analyzeKeywords(["", "   ", "SQL"], GOOD_RESUME);
    expect(result.present).toEqual(["SQL"]);
    expect(result.missing).toEqual([]);
  });
});

describe("analyzeAts", () => {
  test("a well-structured resume scores highly with no errors", () => {
    const result = analyzeAts(parseResumeFacts(GOOD_RESUME), GOOD_RESUME);
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.issues.filter((i) => i.level === "error")).toHaveLength(0);
  });

  test("flags a missing email as an error", () => {
    const result = analyzeAts(parseResumeFacts(WEAK_RESUME), WEAK_RESUME);
    expect(result.issues.some((i) => i.level === "error" && /email/i.test(i.message))).toBe(true);
  });

  test("flags missing skills and education sections", () => {
    const result = analyzeAts(parseResumeFacts(WEAK_RESUME), WEAK_RESUME);
    expect(result.issues.some((i) => /Skills section/i.test(i.message))).toBe(true);
    expect(result.issues.some((i) => /Education section/i.test(i.message))).toBe(true);
  });

  test("flags duty-verb bullets and cites their ids", () => {
    const facts = parseResumeFacts(WEAK_RESUME);
    const result = analyzeAts(facts, WEAK_RESUME);
    const issue = result.issues.find((i) => /duty verb/i.test(i.message));
    expect(issue).toBeDefined();
    expect(issue?.bulletIds?.length).toBeGreaterThan(0);
  });

  test("a weak resume scores below a strong one", () => {
    const good = analyzeAts(parseResumeFacts(GOOD_RESUME), GOOD_RESUME);
    const weak = analyzeAts(parseResumeFacts(WEAK_RESUME), WEAK_RESUME);
    expect(weak.score).toBeLessThan(good.score);
  });

  test("score stays within 0–100", () => {
    const result = analyzeAts(parseResumeFacts(""), "");
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  test("is deterministic across repeated runs", () => {
    const facts = parseResumeFacts(GOOD_RESUME);
    expect(analyzeAts(facts, GOOD_RESUME)).toEqual(analyzeAts(facts, GOOD_RESUME));
  });
});

describe("quantificationRate", () => {
  test("reports the share of bullets carrying numbers", () => {
    const rate = quantificationRate(parseResumeFacts(GOOD_RESUME));
    expect(rate).toBe(1);
  });

  test("is zero when no bullet has a metric", () => {
    expect(quantificationRate(parseResumeFacts(WEAK_RESUME))).toBe(0);
  });

  test("is zero for an empty resume rather than NaN", () => {
    expect(quantificationRate(parseResumeFacts(""))).toBe(0);
  });
});

describe("analyzeReadability", () => {
  test("counts weak leading verbs", () => {
    const result = analyzeReadability(parseResumeFacts(WEAK_RESUME));
    expect(result.weakVerbCount).toBeGreaterThan(0);
  });

  test("lists bullets with no quantification for targeted follow-up", () => {
    const result = analyzeReadability(parseResumeFacts(WEAK_RESUME));
    expect(result.unquantifiedBulletIds.length).toBeGreaterThan(0);
  });

  test("penalizes a resume full of duty verbs", () => {
    const good = analyzeReadability(parseResumeFacts(GOOD_RESUME));
    const weak = analyzeReadability(parseResumeFacts(WEAK_RESUME));
    expect(weak.score).toBeLessThan(good.score);
  });

  test("handles an empty resume without dividing by zero", () => {
    const result = analyzeReadability(parseResumeFacts(""));
    expect(result.score).toBe(0);
    expect(Number.isNaN(result.averageBulletWords)).toBe(false);
  });
});
