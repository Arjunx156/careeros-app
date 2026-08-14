/**
 * Fact preservation for generated resumes.
 *
 * The analyzer's evidence validator answers "is this claim supported?". This
 * answers a stricter question: "does every verifiable fact in this document
 * also appear in the source resume?"
 *
 * Stricter because the output is a document you send to an employer under your
 * own name. An invented employer, an inflated figure, or a shifted date is not
 * a bad suggestion — it is a false statement attributed to you.
 *
 * Pure and deterministic: no AI, no I/O.
 */

import type { ResumeFacts } from "@/lib/analysis/facts";
import { extractQuantities } from "@/lib/analysis/facts";
import { containsTerm, normalize } from "@/lib/analysis/deterministic";
import type { OptimizedResume } from "@/lib/resume/optimized-schema";

export type FactViolation = {
  kind: "number" | "date" | "employer" | "citation" | "skill";
  /** Where it appeared, e.g. "experience[0].bullets[2]". */
  location: string;
  /** The offending value. */
  value: string;
  message: string;
};

export type FactCheckResult = {
  ok: boolean;
  violations: FactViolation[];
};

/**
 * Is this skill grounded in the source?
 *
 * Exact substring matching is wrong here. A model legitimately writes
 * "BiLSTMs (RNN/LSTM)" for a resume that says "BiLSTM-based models", or
 * "REST APIs" for "REST API" — those are the same claim, differently worded.
 * Requiring a literal match deleted real skills.
 *
 * Instead: split the skill into its meaningful parts and accept it when any
 * substantive part is present. An entirely invented skill still has no part in
 * the source and is still caught.
 */
export function isSkillGrounded(skill: string, sourceText: string): boolean {
  if (containsTerm(sourceText, skill)) return true;

  // Split on punctuation separating alternative namings. Word boundaries
  // matter — without them "Pandas" would split on the "and" inside it.
  const parts = skill
    .split(/[(),/&+]|\bor\b|\band\b/i)
    .map((part) => part.trim())
    .filter((part) => part.length > 2);

  return parts.some((part) => containsTerm(sourceText, part));
}

/** Years present anywhere in the source, including inside date ranges. */
function sourceYears(facts: ResumeFacts, sourceText: string): Set<string> {
  const years = new Set<string>();

  for (const range of facts.dateRanges) {
    if (range.startYear) years.add(String(range.startYear));
    if (range.endYear) years.add(String(range.endYear));
  }
  for (const match of sourceText.matchAll(/\b(19|20)\d{2}\b/g)) {
    years.add(match[0]);
  }
  return years;
}

/** Every quantity legitimately present in the source. */
function sourceQuantities(sourceText: string): Set<string> {
  return new Set(extractQuantities(sourceText));
}

/**
 * Check a generated resume against the source it claims to be derived from.
 *
 * Returns violations rather than throwing — the caller decides whether to
 * regenerate, redact, or surface them. Silently accepting is not an option.
 */
export function checkFactPreservation(
  resume: OptimizedResume,
  facts: ResumeFacts,
  sourceText: string,
): FactCheckResult {
  const violations: FactViolation[] = [];

  const knownIds = new Set(facts.evidence.map((item) => item.id));
  const allowedQuantities = sourceQuantities(sourceText);
  const allowedYears = sourceYears(facts, sourceText);
  const normalizedSource = normalize(sourceText);

  // — Experience —
  resume.experience.forEach((role, roleIndex) => {
    const where = `experience[${roleIndex}]`;

    // An employer that appears nowhere in the source is the most dangerous
    // possible output, so it is checked first and hardest.
    if (role.company && !normalizedSource.includes(normalize(role.company))) {
      violations.push({
        kind: "employer",
        location: `${where}.company`,
        value: role.company,
        message: `"${role.company}" does not appear in your resume.`,
      });
    }

    for (const year of role.dates.matchAll(/\b(19|20)\d{2}\b/g)) {
      if (!allowedYears.has(year[0])) {
        violations.push({
          kind: "date",
          location: `${where}.dates`,
          value: year[0],
          message: `The year ${year[0]} does not appear in your resume.`,
        });
      }
    }

    role.bullets.forEach((bullet, bulletIndex) => {
      const bulletWhere = `${where}.bullets[${bulletIndex}]`;

      if (!knownIds.has(bullet.sourceBulletId)) {
        violations.push({
          kind: "citation",
          location: bulletWhere,
          value: bullet.sourceBulletId,
          message: `Cites ${bullet.sourceBulletId}, which is not a line on your resume.`,
        });
      }

      for (const quantity of extractQuantities(bullet.text)) {
        if (!allowedQuantities.has(quantity)) {
          violations.push({
            kind: "number",
            location: bulletWhere,
            value: quantity,
            message: `The figure ${quantity} does not appear in your resume.`,
          });
        }
      }
    });
  });

  // — Education —
  resume.education.forEach((entry, index) => {
    if (
      entry.institution &&
      !normalizedSource.includes(normalize(entry.institution))
    ) {
      violations.push({
        kind: "employer",
        location: `education[${index}].institution`,
        value: entry.institution,
        message: `"${entry.institution}" does not appear in your resume.`,
      });
    }
  });

  // — Summary —
  for (const quantity of extractQuantities(resume.summary)) {
    if (!allowedQuantities.has(quantity)) {
      violations.push({
        kind: "number",
        location: "summary",
        value: quantity,
        message: `The figure ${quantity} does not appear in your resume.`,
      });
    }
  }

  // — Skills —
  // A skill the source never mentions is a claim of competence you did not make.
  resume.skillGroups.forEach((group, groupIndex) => {
    group.items.forEach((skill, skillIndex) => {
      if (!isSkillGrounded(skill, sourceText)) {
        violations.push({
          kind: "skill",
          location: `skillGroups[${groupIndex}].items[${skillIndex}]`,
          value: skill,
          message: `"${skill}" does not appear in your resume.`,
        });
      }
    });
  });

  // — Projects —
  resume.projects.forEach((project, projectIndex) => {
    project.bullets.forEach((bullet, bulletIndex) => {
      const where = `projects[${projectIndex}].bullets[${bulletIndex}]`;

      if (!knownIds.has(bullet.sourceBulletId)) {
        violations.push({
          kind: "citation",
          location: where,
          value: bullet.sourceBulletId,
          message: `Cites ${bullet.sourceBulletId}, which is not a line on your resume.`,
        });
      }

      for (const quantity of extractQuantities(bullet.text)) {
        if (!allowedQuantities.has(quantity)) {
          violations.push({
            kind: "number",
            location: where,
            value: quantity,
            message: `The figure ${quantity} does not appear in your resume.`,
          });
        }
      }
    });
  });

  return { ok: violations.length === 0, violations };
}

/**
 * Remove what cannot be verified, rather than shipping it.
 *
 * Unlike the analyzer — where an unsupported claim is shown to you labelled —
 * a generated document has no room for a caveat. Anything unverifiable is
 * stripped, and the caller reports what was removed.
 */
export function stripUnverifiable(
  resume: OptimizedResume,
  facts: ResumeFacts,
  sourceText: string,
): { resume: OptimizedResume; removed: FactViolation[] } {
  const { violations } = checkFactPreservation(resume, facts, sourceText);
  if (violations.length === 0) return { resume, removed: [] };

  const badLocations = new Set(violations.map((violation) => violation.location));

  const experience = resume.experience
    .map((role, roleIndex) => ({
      ...role,
      bullets: role.bullets.filter(
        (_, bulletIndex) =>
          !badLocations.has(`experience[${roleIndex}].bullets[${bulletIndex}]`),
      ),
    }))
    // Drop a role whose employer is not in the source at all.
    .filter(
      (role, roleIndex) => !badLocations.has(`experience[${roleIndex}].company`),
    );

  const skillGroups = resume.skillGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((skill) => isSkillGrounded(skill, sourceText)),
    }))
    .filter((group) => group.items.length > 0);

  const projects = resume.projects
    .map((project, projectIndex) => ({
      ...project,
      bullets: project.bullets.filter(
        (_, bulletIndex) =>
          !badLocations.has(`projects[${projectIndex}].bullets[${bulletIndex}]`),
      ),
    }))
    .filter((project) => project.bullets.length > 0);

  return {
    resume: { ...resume, experience, skillGroups, projects },
    removed: violations,
  };
}
