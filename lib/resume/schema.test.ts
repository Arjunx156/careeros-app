import { describe, expect, test } from "vitest";
import {
  MAX_RESUME_BYTES,
  createResumeSchema,
  validateResumeFile,
} from "@/lib/resume/schema";

function fakeFile({
  name = "resume.pdf",
  type = "application/pdf",
  size = 1024,
}: { name?: string; type?: string; size?: number } = {}): File {
  const file = new File(["x"], name, { type });
  // File size is read-only; override it so we can test the limit without
  // allocating a 10MB buffer.
  Object.defineProperty(file, "size", { value: size });
  return file;
}

describe("validateResumeFile", () => {
  test("accepts a normal PDF", () => {
    expect(validateResumeFile(fakeFile())).toBeNull();
  });

  test("accepts a PDF whose mime type is missing but extension is .pdf", () => {
    expect(validateResumeFile(fakeFile({ type: "" }))).toBeNull();
  });

  test("accepts a PDF at exactly the size limit", () => {
    expect(validateResumeFile(fakeFile({ size: MAX_RESUME_BYTES }))).toBeNull();
  });

  test("rejects a file one byte over the limit", () => {
    expect(validateResumeFile(fakeFile({ size: MAX_RESUME_BYTES + 1 }))).toBe(
      "File must be under 10MB.",
    );
  });

  test("rejects an empty file", () => {
    expect(validateResumeFile(fakeFile({ size: 0 }))).toBe("That file is empty.");
  });

  test("rejects a non-PDF", () => {
    expect(
      validateResumeFile(fakeFile({ name: "resume.docx", type: "application/msword" })),
    ).toBe("Only PDF files are supported.");
  });

  test("rejects a file merely named like a PDF mid-string", () => {
    expect(
      validateResumeFile(fakeFile({ name: "resume.pdf.exe", type: "application/x-msdownload" })),
    ).toBe("Only PDF files are supported.");
  });
});

describe("createResumeSchema", () => {
  test("requires a name", () => {
    const result = createResumeSchema.safeParse({ name: "   " });
    expect(result.success).toBe(false);
  });

  test("trims the name and defaults isMaster to false", () => {
    const result = createResumeSchema.parse({ name: "  BA v2  " });
    expect(result.name).toBe("BA v2");
    expect(result.isMaster).toBe(false);
  });

  test("converts blank optional fields to null rather than empty strings", () => {
    const result = createResumeSchema.parse({
      name: "BA v2",
      targetRole: "",
      targetIndustry: "   ",
    });
    expect(result.targetRole).toBeNull();
    expect(result.targetIndustry).toBeNull();
  });
});
