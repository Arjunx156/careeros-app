import { describe, expect, test } from "vitest";
import { parseResumeFacts } from "@/lib/analysis/facts";
import {
  checkFactPreservation,
  isSkillGrounded,
  stripUnverifiable,
} from "@/lib/resume/fact-guard";
import type { OptimizedResume } from "@/lib/resume/optimized-schema";

const SOURCE = `Arjun Krishnan
arjun@example.com

PROFESSIONAL SUMMARY
Business analyst with 2 years of experience.

EXPERIENCE
Business Analyst — Acme Payments, Dublin (2023-Present)
• Gathered requirements across 3 product teams, documenting 40+ user stories in Jira.
• Built Power BI dashboards tracking 12 KPIs.

SKILLS
SQL, Python, Power BI, Jira

EDUCATION
MSc Business Analytics — University College Dublin, 2022`;

const facts = parseResumeFacts(SOURCE);

function makeResume(overrides: Partial<OptimizedResume> = {}): OptimizedResume {
  return {
    header: {
      name: "Arjun Krishnan",
      title: "Business Analyst",
      location: "Dublin",
      email: "arjun@example.com",
      phone: "",
      links: [],
    },
    summary: "Business analyst with 2 years of experience.",
    experience: [
      {
        company: "Acme Payments",
        role: "Business Analyst",
        location: "Dublin",
        dates: "2023-Present",
        bullets: [
          {
            text: "Gathered requirements across 3 product teams, documenting 40+ user stories.",
            sourceBulletId: "b1",
          },
        ],
      },
    ],
    projects: [],
    education: [
      {
        institution: "University College Dublin",
        qualification: "MSc Business Analytics",
        dates: "2022",
        detail: "",
      },
    ],
    skillGroups: [{ label: "Technical", items: ["SQL", "Python", "Power BI"] }],
    changeNotes: [],
    ...overrides,
  };
}

describe("checkFactPreservation — clean output", () => {
  test("passes a resume that only reuses source facts", () => {
    const result = checkFactPreservation(makeResume(), facts, SOURCE);
    expect(result.ok).toBe(true);
    expect(result.violations).toEqual([]);
  });
});

describe("checkFactPreservation — invented facts", () => {
  test("catches an employer that is not on the source resume", () => {
    const resume = makeResume();
    resume.experience[0].company = "Google";

    const result = checkFactPreservation(resume, facts, SOURCE);
    expect(result.ok).toBe(false);
    expect(result.violations[0]).toMatchObject({ kind: "employer", value: "Google" });
  });

  test("catches an invented figure in a bullet", () => {
    const resume = makeResume();
    resume.experience[0].bullets[0].text = "Improved efficiency by 87%.";

    const result = checkFactPreservation(resume, facts, SOURCE);
    expect(result.violations.some((v) => v.kind === "number" && v.value === "87")).toBe(
      true,
    );
  });

  test("catches an invented figure in the summary", () => {
    const result = checkFactPreservation(
      makeResume({ summary: "Analyst who cut costs by 55%." }),
      facts,
      SOURCE,
    );
    expect(result.violations.some((v) => v.location === "summary")).toBe(true);
  });

  test("catches a shifted employment year", () => {
    const resume = makeResume();
    resume.experience[0].dates = "2019-Present";

    const result = checkFactPreservation(resume, facts, SOURCE);
    expect(result.violations.some((v) => v.kind === "date" && v.value === "2019")).toBe(
      true,
    );
  });

  test("catches a citation to a bullet that does not exist", () => {
    const resume = makeResume();
    resume.experience[0].bullets[0].sourceBulletId = "b99";

    const result = checkFactPreservation(resume, facts, SOURCE);
    expect(result.violations.some((v) => v.kind === "citation")).toBe(true);
  });

  test("catches a skill the source never claims", () => {
    const result = checkFactPreservation(
      makeResume({ skillGroups: [{ label: "Technical", items: ["Kubernetes"] }] }),
      facts,
      SOURCE,
    );
    expect(result.violations.some((v) => v.value === "Kubernetes")).toBe(true);
  });

  test("catches an invented university", () => {
    const resume = makeResume();
    resume.education[0].institution = "Harvard University";

    const result = checkFactPreservation(resume, facts, SOURCE);
    expect(result.violations.some((v) => v.value === "Harvard University")).toBe(true);
  });

  test("accepts figures that exist in the source but move between bullets", () => {
    const resume = makeResume();
    // 12 comes from a different bullet — still a real number from this resume.
    resume.experience[0].bullets[0].text = "Tracked 12 KPIs across 3 teams.";

    expect(checkFactPreservation(resume, facts, SOURCE).ok).toBe(true);
  });

  test("reports every violation, not just the first", () => {
    const resume = makeResume();
    resume.experience[0].company = "Google";
    resume.experience[0].bullets[0].text = "Grew revenue 99%.";

    const result = checkFactPreservation(resume, facts, SOURCE);
    expect(result.violations.length).toBeGreaterThanOrEqual(2);
  });
});

describe("stripUnverifiable", () => {
  test("removes a bullet containing an invented figure", () => {
    const resume = makeResume();
    resume.experience[0].bullets.push({
      text: "Cut costs by 91%.",
      sourceBulletId: "b2",
    });

    const { resume: cleaned, removed } = stripUnverifiable(resume, facts, SOURCE);
    expect(cleaned.experience[0].bullets).toHaveLength(1);
    expect(removed.length).toBeGreaterThan(0);
  });

  test("removes a role whose employer is not on the source", () => {
    const resume = makeResume();
    resume.experience.push({
      company: "Google",
      role: "Analyst",
      location: "",
      dates: "",
      bullets: [],
    });

    const { resume: cleaned } = stripUnverifiable(resume, facts, SOURCE);
    expect(cleaned.experience.map((r) => r.company)).toEqual(["Acme Payments"]);
  });

  test("removes only the unverifiable skill, keeping the rest", () => {
    const resume = makeResume({
      skillGroups: [{ label: "Technical", items: ["SQL", "Kubernetes", "Python"] }],
    });

    const { resume: cleaned } = stripUnverifiable(resume, facts, SOURCE);
    expect(cleaned.skillGroups[0].items).toEqual(["SQL", "Python"]);
  });

  test("drops a skill group left empty after stripping", () => {
    const resume = makeResume({
      skillGroups: [{ label: "Infra", items: ["Kubernetes", "Terraform"] }],
    });

    const { resume: cleaned } = stripUnverifiable(resume, facts, SOURCE);
    expect(cleaned.skillGroups).toEqual([]);
  });

  test("returns a clean resume untouched", () => {
    const resume = makeResume();
    const { resume: cleaned, removed } = stripUnverifiable(resume, facts, SOURCE);
    expect(removed).toEqual([]);
    expect(cleaned).toEqual(resume);
  });
});

describe("isSkillGrounded", () => {
  const source =
    "Published research on BiLSTM-based deep learning models. Built REST API endpoints with FastAPI. Used pandas and NumPy for analysis.";

  test("accepts an exact match", () => {
    expect(isSkillGrounded("FastAPI", source)).toBe(true);
  });

  test("accepts a plural of a source term", () => {
    // The source says "REST API"; "REST APIs" is the same claim.
    expect(isSkillGrounded("REST APIs", source)).toBe(true);
  });

  test("accepts a parenthesised expansion when the base term is present", () => {
    // Real false positive from a live run: the source says "BiLSTM-based".
    expect(isSkillGrounded("BiLSTMs (RNN/LSTM)", source)).toBe(true);
  });

  test("does not split a word that merely contains 'and'", () => {
    // "Pandas" must not be split on the "and" inside it.
    expect(isSkillGrounded("Pandas", source)).toBe(true);
  });

  test("still rejects a wholly invented skill", () => {
    expect(isSkillGrounded("Kubernetes", source)).toBe(false);
  });

  test("rejects an invented skill dressed up with punctuation", () => {
    expect(isSkillGrounded("Terraform (IaC)", source)).toBe(false);
  });
});

describe("projects section", () => {
  test("validates project bullets like experience bullets", () => {
    const resume = makeResume({
      projects: [
        {
          name: "Portfolio site",
          context: "Personal",
          dates: "2024",
          bullets: [{ text: "Shipped it in 77 days.", sourceBulletId: "b1" }],
        },
      ],
    });

    const result = checkFactPreservation(resume, facts, SOURCE);
    expect(result.violations.some((v) => v.location.startsWith("projects["))).toBe(true);
  });

  test("keeps a project whose bullets all check out", () => {
    const resume = makeResume({
      projects: [
        {
          name: "Dashboard",
          context: "",
          dates: "",
          bullets: [{ text: "Tracked 12 KPIs.", sourceBulletId: "b2" }],
        },
      ],
    });

    const { resume: cleaned } = stripUnverifiable(resume, facts, SOURCE);
    expect(cleaned.projects).toHaveLength(1);
  });
});
