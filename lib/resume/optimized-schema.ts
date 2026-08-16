import { z } from "zod";
import { cappedArray } from "@/lib/ai/zod-to-gemini";

/**
 * Structure of an AI-optimized resume.
 *
 * Every generated bullet carries `sourceBulletId`, pointing at the evidence
 * unit it was rewritten from. That turns "did the AI invent this line?" from a
 * judgement call into a lookup — see lib/resume/fact-guard.ts.
 *
 * The stakes are higher here than in the analyzer. A wrong analysis wastes your
 * time; a resume with an invented employer or an inflated metric gets sent to
 * an employer under your name.
 */

const evidenceId = z.string().regex(/^[bsk]\d+$/);

export const optimizedBulletSchema = z.object({
  text: z.string().min(1),
  /** The source bullet this was rewritten from. */
  sourceBulletId: evidenceId,
});

export const optimizedExperienceSchema = z.object({
  company: z.string().min(1),
  role: z.string().min(1),
  location: z.string().default(""),
  /** Copied verbatim from the source — never reformatted or inferred. */
  dates: z.string().default(""),
  bullets: cappedArray(optimizedBulletSchema, 8),
});

export const optimizedProjectSchema = z.object({
  name: z.string().min(1),
  /** Optional context: coursework, hackathon, personal. */
  context: z.string().default(""),
  dates: z.string().default(""),
  bullets: cappedArray(optimizedBulletSchema, 5),
});

export const optimizedEducationSchema = z.object({
  institution: z.string().min(1),
  qualification: z.string().default(""),
  dates: z.string().default(""),
  detail: z.string().default(""),
});

export const optimizedSkillGroupSchema = z.object({
  label: z.string().min(1),
  items: cappedArray(z.string(), 20),
});

export const optimizedResumeSchema = z.object({
  header: z.object({
    name: z.string().default(""),
    title: z.string().default(""),
    location: z.string().default(""),
    email: z.string().default(""),
    phone: z.string().default(""),
    links: cappedArray(z.string(), 4).default([]),
  }),
  /** Tailored professional summary. */
  summary: z.string(),
  experience: cappedArray(optimizedExperienceSchema, 8),
  projects: cappedArray(optimizedProjectSchema, 6).default([]),
  education: cappedArray(optimizedEducationSchema, 5),
  skillGroups: cappedArray(optimizedSkillGroupSchema, 5),
  /** What changed and why, shown beside the preview — not part of the document. */
  changeNotes: cappedArray(z.string(), 10).default([]),
});

export type OptimizedResume = z.infer<typeof optimizedResumeSchema>;
export type OptimizedExperience = z.infer<typeof optimizedExperienceSchema>;
export type OptimizedBullet = z.infer<typeof optimizedBulletSchema>;
export type OptimizedProject = z.infer<typeof optimizedProjectSchema>;
