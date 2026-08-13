import { z } from "zod";

export const MAX_RESUME_BYTES = 10 * 1024 * 1024; // 10MB, per docs/03_App_Flow.md
export const ACCEPTED_MIME_TYPES = ["application/pdf"] as const;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value.length === 0 ? null : value))
    .nullable()
    .optional();

export const createResumeSchema = z.object({
  name: z.string().trim().min(1, "Give this version a name.").max(120),
  targetRole: optionalText(120),
  targetIndustry: optionalText(120),
  isMaster: z.boolean().default(false),
});

export const updateResumeSchema = z.object({
  name: z.string().trim().min(1, "Give this version a name.").max(120).optional(),
  targetRole: optionalText(120),
  targetIndustry: optionalText(120),
  isMaster: z.boolean().optional(),
  notes: optionalText(5000),
});

export type CreateResumeInput = z.infer<typeof createResumeSchema>;
export type UpdateResumeInput = z.infer<typeof updateResumeSchema>;

/** Validate the uploaded file before touching storage or the parser. */
export function validateResumeFile(file: File): string | null {
  if (file.size === 0) return "That file is empty.";
  if (file.size > MAX_RESUME_BYTES) return "File must be under 10MB.";

  const isPdf =
    (ACCEPTED_MIME_TYPES as readonly string[]).includes(file.type) ||
    file.name.toLowerCase().endsWith(".pdf");

  if (!isPdf) return "Only PDF files are supported.";

  return null;
}
