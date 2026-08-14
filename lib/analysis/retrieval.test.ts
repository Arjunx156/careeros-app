import { describe, expect, test } from "vitest";
import { parseResumeFacts } from "@/lib/analysis/facts";
import {
  indexResume,
  retrieveEvidence,
  retrieveForRequirements,
} from "@/lib/analysis/retrieval";

const RESUME = `EXPERIENCE
Business Analyst — Acme Payments (2023-Present)
• Wrote complex SQL queries against Postgres to investigate reconciliation breaks.
• Built Power BI dashboards tracking 12 KPIs for the finance team.
• Facilitated weekly stakeholder workshops with product and engineering leads.
• Mapped eight end-to-end payment processing flows in Visio.

Data Analyst Intern — Globex (2022-2023)
• Automated a weekly reporting pipeline in Python using pandas.
• Ran A/B tests on the checkout funnel covering 50,000 users.`;

const facts = parseResumeFacts(RESUME);

describe("retrieveEvidence", () => {
  test("ranks the SQL bullet first for a SQL requirement", () => {
    const hits = retrieveEvidence(indexResume(facts), "Advanced SQL query writing");
    expect(hits[0]?.bullet.text).toContain("SQL");
  });

  test("ranks the stakeholder bullet first for a communication requirement", () => {
    const hits = retrieveEvidence(indexResume(facts), "stakeholder communication");
    expect(hits[0]?.bullet.text).toContain("stakeholder");
  });

  test("ranks the process mapping bullet first for a mapping requirement", () => {
    const hits = retrieveEvidence(indexResume(facts), "process mapping experience");
    expect(hits[0]?.bullet.text).toMatch(/Mapped|flows/);
  });

  test("returns nothing when no bullet is relevant", () => {
    const hits = retrieveEvidence(indexResume(facts), "Kubernetes cluster administration");
    expect(hits).toEqual([]);
  });

  test("respects the result limit", () => {
    const hits = retrieveEvidence(indexResume(facts), "data reporting analysis", 2);
    expect(hits.length).toBeLessThanOrEqual(2);
  });

  test("reports which query terms matched", () => {
    const hits = retrieveEvidence(indexResume(facts), "Python pandas");
    expect(hits[0]?.matchedTerms.length).toBeGreaterThan(0);
  });

  test("ignores stop words so a generic query does not match everything", () => {
    // Every one of these is a stop word; nothing should score.
    const hits = retrieveEvidence(indexResume(facts), "the and with your team experience");
    expect(hits).toEqual([]);
  });

  test("is deterministic — identical query gives identical ranking", () => {
    const index = indexResume(facts);
    const a = retrieveEvidence(index, "SQL reporting");
    const b = retrieveEvidence(index, "SQL reporting");
    expect(a.map((h) => h.bullet.id)).toEqual(b.map((h) => h.bullet.id));
  });

  test("handles an empty resume without throwing", () => {
    expect(retrieveEvidence(indexResume(parseResumeFacts("")), "SQL")).toEqual([]);
  });
});

describe("retrieveForRequirements", () => {
  const requirements = [
    "Advanced SQL",
    "Stakeholder communication",
    "Kubernetes administration",
  ];
  const result = retrieveForRequirements(facts, requirements, 3);

  test("returns one entry per requirement, in order", () => {
    expect(result.byRequirement.map((r) => r.requirement)).toEqual(requirements);
  });

  test("returns an empty id list for an unmatched requirement", () => {
    const kubernetes = result.byRequirement.find((r) =>
      r.requirement.startsWith("Kubernetes"),
    );
    expect(kubernetes?.bulletIds).toEqual([]);
  });

  test("deduplicates bullets across requirements", () => {
    const ids = result.bullets.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("every cited id resolves to a returned bullet", () => {
    const available = new Set(result.bullets.map((b) => b.id));
    for (const entry of result.byRequirement) {
      for (const id of entry.bulletIds) expect(available.has(id)).toBe(true);
    }
  });

  test("sends far less text than the full resume", () => {
    const evidenceChars = result.bullets.reduce((sum, b) => sum + b.text.length, 0);
    expect(evidenceChars).toBeLessThan(RESUME.length);
  });
});
