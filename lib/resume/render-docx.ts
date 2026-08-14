import "server-only";

import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TabStopType,
  TextRun,
} from "docx";
import type { OptimizedResume } from "@/lib/resume/optimized-schema";

/**
 * ATS-safe DOCX.
 *
 * Same discipline as the PDF: one column, real paragraph styles, native bullet
 * lists. No tables and no text boxes — both are the classic reason a Word
 * resume parses as an empty document.
 *
 * Dates sit on a right tab stop rather than in a table cell, which reads the
 * same to a human and stays linear for a parser.
 */

const RIGHT_TAB = 9020; // ~A4 width minus margins, in twips.

function heading(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 240, after: 100 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 6, color: "D1D5DB", space: 2 },
    },
    children: [
      new TextRun({ text, bold: true, size: 20, characterSpacing: 20 }),
    ],
  });
}

function bullet(text: string): Paragraph {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 40 },
    children: [new TextRun({ text, size: 20 })],
  });
}

/** Title on the left, dates right-aligned on a tab stop. */
function titleWithDates(title: string, dates: string): Paragraph {
  return new Paragraph({
    tabStops: [{ type: TabStopType.RIGHT, position: RIGHT_TAB }],
    spacing: { before: 160, after: 20 },
    children: [
      new TextRun({ text: title, bold: true, size: 21 }),
      ...(dates
        ? [new TextRun({ text: `\t${dates}`, size: 19, color: "4B5563" })]
        : []),
    ],
  });
}

export async function renderResumeDocx(resume: OptimizedResume): Promise<Buffer> {
  const children: Paragraph[] = [];

  if (resume.header.name) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.TITLE,
        spacing: { after: 40 },
        children: [new TextRun({ text: resume.header.name, bold: true, size: 40 })],
      }),
    );
  }

  if (resume.header.title) {
    children.push(
      new Paragraph({
        spacing: { after: 60 },
        children: [
          new TextRun({ text: resume.header.title, size: 22, color: "4B5563" }),
        ],
      }),
    );
  }

  const contact = [
    resume.header.location,
    resume.header.email,
    resume.header.phone,
    ...resume.header.links,
  ]
    .filter((part) => part && part.trim().length > 0)
    .join("  ·  ");

  if (contact) {
    children.push(
      new Paragraph({
        spacing: { after: 120 },
        children: [new TextRun({ text: contact, size: 18, color: "4B5563" })],
      }),
    );
  }

  if (resume.summary) {
    children.push(heading("SUMMARY"));
    children.push(
      new Paragraph({ children: [new TextRun({ text: resume.summary, size: 20 })] }),
    );
  }

  if (resume.experience.length > 0) {
    children.push(heading("EXPERIENCE"));
    for (const role of resume.experience) {
      children.push(titleWithDates(role.role, role.dates));
      children.push(
        new Paragraph({
          spacing: { after: 60 },
          children: [
            new TextRun({
              text: [role.company, role.location].filter(Boolean).join(", "),
              size: 20,
              color: "374151",
            }),
          ],
        }),
      );
      for (const item of role.bullets) children.push(bullet(item.text));
    }
  }

  if (resume.projects.length > 0) {
    children.push(heading("PROJECTS"));
    for (const project of resume.projects) {
      children.push(titleWithDates(project.name, project.dates));
      if (project.context) {
        children.push(
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: project.context, size: 20, color: "374151" }),
            ],
          }),
        );
      }
      for (const item of project.bullets) children.push(bullet(item.text));
    }
  }

  if (resume.skillGroups.length > 0) {
    children.push(heading("SKILLS"));
    for (const group of resume.skillGroups) {
      children.push(
        new Paragraph({
          spacing: { after: 40 },
          children: [
            new TextRun({ text: `${group.label}: `, bold: true, size: 20 }),
            new TextRun({ text: group.items.join(", "), size: 20 }),
          ],
        }),
      );
    }
  }

  if (resume.education.length > 0) {
    children.push(heading("EDUCATION"));
    for (const entry of resume.education) {
      children.push(titleWithDates(entry.qualification, entry.dates));
      children.push(
        new Paragraph({
          spacing: { after: 40 },
          children: [
            new TextRun({ text: entry.institution, size: 20, color: "374151" }),
          ],
        }),
      );
      if (entry.detail) {
        children.push(
          new Paragraph({ children: [new TextRun({ text: entry.detail, size: 20 })] }),
        );
      }
    }
  }

  const document = new Document({
    creator: resume.header.name || "CareerOS",
    title: `${resume.header.name || "Resume"} — Resume`,
    styles: {
      default: {
        document: {
          run: { font: "Calibri", size: 20 },
          paragraph: { alignment: AlignmentType.LEFT },
        },
      },
    },
    sections: [
      {
        properties: {
          page: { margin: { top: 720, bottom: 720, left: 900, right: 900 } },
        },
        children,
      },
    ],
  });

  return Packer.toBuffer(document);
}
