import { describe, expect, test } from "vitest";
import { renderResumePdf } from "@/lib/resume/render-pdf";
import { renderResumeDocx } from "@/lib/resume/render-docx";
import { extractPdfText } from "@/lib/resume/extract";
import type { OptimizedResume } from "@/lib/resume/optimized-schema";

const RESUME: OptimizedResume = {
  header: {
    name: "Arjun Krishnan",
    title: "Business Analyst",
    location: "Dublin, Ireland",
    email: "arjun@example.com",
    phone: "+353 1 234 5678",
    links: ["linkedin.com/in/example"],
  },
  summary:
    "Business analyst with 2 years turning stakeholder requirements into SQL-backed reporting for product and finance teams.",
  experience: [
    {
      company: "Acme Payments",
      role: "Business Analyst",
      location: "Dublin",
      dates: "2023-Present",
      bullets: [
        {
          text: "Gathered requirements across 3 product teams, documenting 40+ user stories in Jira.",
          sourceBulletId: "b1",
        },
        {
          text: "Built Power BI dashboards tracking 12 KPIs, cutting the reporting cycle from 5 days to 3.",
          sourceBulletId: "b2",
        },
      ],
    },
    {
      company: "Globex",
      role: "Data Analyst Intern",
      location: "Amsterdam",
      dates: "2022-2023",
      bullets: [
        {
          text: "Automated a weekly reporting pipeline in Python, saving roughly 6 hours per week.",
          sourceBulletId: "b4",
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
  skillGroups: [
    { label: "Technical", items: ["SQL", "Python", "Power BI", "Tableau"] },
    { label: "Domain", items: ["Requirements Gathering", "Process Mapping"] },
  ],
  changeNotes: ["Led each bullet with the action taken."],
};

describe("renderResumePdf", () => {
  test("produces a valid PDF", async () => {
    const buffer = await renderResumePdf(RESUME);
    expect(buffer.byteLength).toBeGreaterThan(1000);
    expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
  }, 30_000);

  /**
   * The round trip that matters: if our own extractor cannot read the resume we
   * generated, an ATS will not read it either.
   */
  test("the generated PDF is text-extractable, not an image", async () => {
    const buffer = await renderResumePdf(RESUME);
    const extracted = await extractPdfText(buffer);

    expect(extracted.ok).toBe(true);
  }, 30_000);

  test("every fact survives the round trip through the PDF", async () => {
    const buffer = await renderResumePdf(RESUME);
    const extracted = await extractPdfText(buffer);
    if (!extracted.ok) throw new Error("extraction failed");

    const text = extracted.text.replace(/\s+/g, " ");

    for (const expected of [
      "Arjun Krishnan",
      "arjun@example.com",
      "Acme Payments",
      "Business Analyst",
      "2023-Present",
      "40+ user stories",
      "12 KPIs",
      "Globex",
      "University College Dublin",
      "MSc Business Analytics",
      "Power BI",
    ]) {
      expect(text).toContain(expected);
    }
  }, 30_000);

  test("section headings survive, so a parser can find the sections", async () => {
    const buffer = await renderResumePdf(RESUME);
    const extracted = await extractPdfText(buffer);
    if (!extracted.ok) throw new Error("extraction failed");

    for (const headingText of ["SUMMARY", "EXPERIENCE", "SKILLS", "EDUCATION"]) {
      expect(extracted.text).toContain(headingText);
    }
  }, 30_000);

  test("renders a minimal resume without throwing", async () => {
    const minimal: OptimizedResume = {
      header: { name: "A", title: "", location: "", email: "", phone: "", links: [] },
      summary: "",
      experience: [],
      projects: [],
      education: [],
      skillGroups: [],
      changeNotes: [],
    };
    const buffer = await renderResumePdf(minimal);
    expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
  }, 30_000);
});

describe("renderResumeDocx", () => {
  test("produces a valid DOCX", async () => {
    const buffer = await renderResumeDocx(RESUME);
    expect(buffer.byteLength).toBeGreaterThan(1000);
    // DOCX is a zip archive; every zip starts with "PK".
    expect(buffer.subarray(0, 2).toString()).toBe("PK");
  }, 30_000);

  test("contains the document body parts Word expects", async () => {
    const buffer = await renderResumeDocx(RESUME);
    const asText = buffer.toString("latin1");
    expect(asText).toContain("word/document.xml");
  }, 30_000);

  test("renders a minimal resume without throwing", async () => {
    const minimal: OptimizedResume = {
      header: { name: "A", title: "", location: "", email: "", phone: "", links: [] },
      summary: "",
      experience: [],
      projects: [],
      education: [],
      skillGroups: [],
      changeNotes: [],
    };
    const buffer = await renderResumeDocx(minimal);
    expect(buffer.subarray(0, 2).toString()).toBe("PK");
  }, 30_000);
});
