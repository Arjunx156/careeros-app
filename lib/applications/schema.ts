import { z } from "zod";
import { APPLICATION_STATUSES } from "@/lib/applications/status";

/** Blank strings from a form mean "not provided", not an empty value. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value.length === 0 ? null : value))
    .nullable()
    .optional();

const optionalDate = z
  .string()
  .trim()
  .transform((value) => (value.length === 0 ? null : new Date(value)))
  .nullable()
  .optional()
  .refine(
    (value) => value === null || value === undefined || !Number.isNaN(value.getTime()),
    "That date is not valid.",
  );

const optionalInt = z
  .union([z.number(), z.string()])
  .transform((value) => {
    if (typeof value === "number") return value;
    const trimmed = value.trim();
    if (trimmed.length === 0) return null;
    const parsed = Number(trimmed.replace(/[,\s]/g, ""));
    return Number.isFinite(parsed) ? Math.round(parsed) : null;
  })
  .nullable()
  .optional();

const statusEnum = z.enum(APPLICATION_STATUSES);
const methodEnum = z.enum([
  "direct",
  "linkedin",
  "referral",
  "recruiter",
  "job_board",
  "other",
]);
const workTypeEnum = z.enum(["remote", "hybrid", "onsite"]);

export const createApplicationSchema = z.object({
  company: z.string().trim().min(1, "Company is required.").max(120),
  role: z.string().trim().min(1, "Role is required.").max(160),
  status: statusEnum.default("applied"),

  location: optionalText(120),
  country: optionalText(80),
  workType: workTypeEnum.nullable().optional(),
  jobUrl: optionalText(500),

  salaryMin: optionalInt,
  salaryMax: optionalInt,
  salaryCurrency: optionalText(8),

  applicationDate: optionalDate,
  applicationMethod: methodEnum.nullable().optional(),
  coverLetterUsed: z.boolean().default(false),
  referralPerson: optionalText(120),

  resumeVersionId: optionalText(40),
  jobDescriptionId: optionalText(40),
  analysisId: optionalText(40),

  recruiterName: optionalText(120),
  recruiterEmail: optionalText(160),
  recruiterLinkedin: optionalText(300),
  hiringManagerName: optionalText(120),
  hiringManagerLinkedin: optionalText(300),
  contactId: optionalText(40),

  nextFollowupDate: optionalDate,
  notes: optionalText(10_000),
});

/** Every field optional on update; status changes are recorded to the timeline. */
export const updateApplicationSchema = createApplicationSchema.partial().extend({
  rejectionReason: optionalText(500),
  outcome: z.enum(["hired", "rejected", "withdrew", "ghosted"]).nullable().optional(),
  matchScore: optionalInt,
});

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
export type UpdateApplicationInput = z.infer<typeof updateApplicationSchema>;

export const interviewSchema = z.object({
  stage: z.enum([
    "phone_screen",
    "technical",
    "case_study",
    "panel",
    "final",
    "offer",
  ]),
  scheduledAt: optionalDate,
  durationMins: optionalInt,
  format: optionalText(40),
  interviewers: z.array(z.string().trim().min(1)).max(8).default([]),
  notes: optionalText(5000),
  outcome: z.enum(["passed", "failed", "pending", "cancelled"]).default("pending"),
});

export type InterviewInput = z.infer<typeof interviewSchema>;
