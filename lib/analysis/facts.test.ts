import { describe, expect, test } from "vitest";
import {
  bulletsByIds,
  extractDateRanges,
  joinWrappedLines,
  parseResumeFacts,
} from "@/lib/analysis/facts";

/** Shaped like real pdf-parse output, including mid-sentence wrapping. */
const RESUME = `Arjun Krishnan
Business Analyst · Dublin, Ireland · arjun@example.com

PROFESSIONAL SUMMARY
Business analyst with 2 years of experience translating stakeholder requirements into SQL-
backed reporting for product and finance teams. MSc Business Analytics.

EXPERIENCE
Business Analyst — Acme Payments, Dublin (2023-Present)
• Gathered requirements across 3 product teams, documenting 40+ user stories in Jira.
• Built Power BI dashboards tracking 12 KPIs, cutting the monthly reporting cycle from 5
days to 3.
• Responsible for various stakeholder meetings.

Data Analyst Intern — Globex, Amsterdam (2022-2023)
• Automated a weekly reporting pipeline in Python, saving roughly 6 hours per week.

SKILLS
SQL, Python, Power BI, Tableau, Jira, Requirements Gathering

EDUCATION
MSc Business Analytics — University College Dublin, 2022`;

describe("joinWrappedLines", () => {
  test("rejoins a sentence split mid-word across lines", () => {
    const joined = joinWrappedLines([
      "• Built dashboards tracking 12 KPIs, cutting the cycle from 5",
      "days to 3.",
    ]);
    expect(joined).toHaveLength(1);
    expect(joined[0]).toContain("from 5 days to 3.");
  });

  test("does not join two separate bullets", () => {
    const joined = joinWrappedLines(["• First bullet.", "• Second bullet."]);
    expect(joined).toHaveLength(2);
  });

  test("does not join a heading onto the previous line", () => {
    const joined = joinWrappedLines(["Some trailing text", "EXPERIENCE"]);
    expect(joined).toHaveLength(2);
  });

  test("preserves blank lines as block separators", () => {
    expect(joinWrappedLines(["a", "", "b"])).toEqual(["a", "", "b"]);
  });
});

describe("parseResumeFacts", () => {
  const facts = parseResumeFacts(RESUME);

  test("detects the standard sections", () => {
    const kinds = facts.sections.map((s) => s.kind);
    expect(kinds).toContain("summary");
    expect(kinds).toContain("experience");
    expect(kinds).toContain("skills");
    expect(kinds).toContain("education");
  });

  test("assigns every bullet a stable sequential id", () => {
    expect(facts.bullets.length).toBeGreaterThanOrEqual(4);
    expect(facts.bullets.map((b) => b.id).slice(0, 4)).toEqual([
      "b1",
      "b2",
      "b3",
      "b4",
    ]);
  });

  test("ids are unique", () => {
    const ids = facts.bullets.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("captures the wrapped bullet as a single complete bullet", () => {
    const wrapped = facts.bullets.find((b) => b.text.includes("Power BI"));
    expect(wrapped?.text).toContain("from 5 days to 3");
  });

  test("extracts quantities from bullets", () => {
    const bullet = facts.bullets.find((b) => b.text.includes("user stories"));
    expect(bullet?.quantities).toEqual(expect.arrayContaining(["3", "40"]));
  });

  test("identifies the leading verb", () => {
    const bullet = facts.bullets.find((b) => b.text.startsWith("Gathered"));
    expect(bullet?.leadingVerb).toBe("gathered");
  });

  test("flags a duty-style bullet by its weak leading verb", () => {
    const bullet = facts.bullets.find((b) => b.text.startsWith("Responsible"));
    expect(bullet?.leadingVerb).toBe("responsible");
  });

  test("parses the skills list into individual skills", () => {
    expect(facts.declaredSkills).toEqual(
      expect.arrayContaining(["SQL", "Python", "Power BI", "Tableau"]),
    );
  });

  test("does not treat the skills line as a bullet", () => {
    expect(facts.bullets.some((b) => b.text.startsWith("SQL, Python"))).toBe(false);
  });

  test("captures the summary separately from bullets", () => {
    expect(facts.summaryText).toContain("Business analyst with 2 years");
  });

  test("extracts contact details", () => {
    expect(facts.contact.email).toBe("arjun@example.com");
  });

  test("assigns bullets to their containing section", () => {
    const bullet = facts.bullets.find((b) => b.text.includes("user stories"));
    expect(bullet?.sectionKind).toBe("experience");
  });

  test("returns an empty but valid shape for empty input", () => {
    const empty = parseResumeFacts("");
    expect(empty.bullets).toEqual([]);
    expect(empty.declaredSkills).toEqual([]);
    expect(empty.totalWords).toBe(0);
  });
});

describe("extractDateRanges", () => {
  test("reads a year range", () => {
    const [range] = extractDateRanges("Globex, Amsterdam (2022-2023)");
    expect(range).toMatchObject({ startYear: 2022, endYear: 2023, isCurrent: false });
  });

  test("recognizes an ongoing role", () => {
    const [range] = extractDateRanges("Acme Payments (2023-Present)");
    expect(range).toMatchObject({ startYear: 2023, isCurrent: true });
  });

  test("handles month-qualified ranges", () => {
    const [range] = extractDateRanges("Jan 2021 – Mar 2022");
    expect(range).toMatchObject({ startYear: 2021, endYear: 2022 });
  });

  test("returns nothing when there are no dates", () => {
    expect(extractDateRanges("No dates in this line")).toEqual([]);
  });
});

describe("bulletsByIds", () => {
  const facts = parseResumeFacts(RESUME);

  test("resolves known ids in order", () => {
    const found = bulletsByIds(facts, ["b2", "b1"]);
    expect(found.map((b) => b.id)).toEqual(["b2", "b1"]);
  });

  test("silently drops ids that do not exist", () => {
    // This is what makes a fabricated citation detectable rather than fatal.
    const found = bulletsByIds(facts, ["b1", "b999"]);
    expect(found.map((b) => b.id)).toEqual(["b1"]);
  });
});

describe("computeExperienceYears", () => {
  test("sums sequential roles", () => {
    const f = parseResumeFacts("Role A (2019-2021)\nRole B (2021-2023)");
    expect(f.totalExperienceYears).toBe(4);
  });

  test("merges overlapping roles rather than double-counting", () => {
    const f = parseResumeFacts("Role A (2019-2023)\nRole B (2020-2022)");
    expect(f.totalExperienceYears).toBe(4);
  });

  test("treats a current role as running to this year", () => {
    const start = new Date().getFullYear() - 3;
    const f = parseResumeFacts(`Role A (${start}-Present)`);
    expect(f.totalExperienceYears).toBe(3);
  });

  test("returns null when no dates are present", () => {
    expect(parseResumeFacts("No dates here").totalExperienceYears).toBeNull();
  });
});
