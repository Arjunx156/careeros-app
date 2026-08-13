import { describe, expect, test } from "vitest";
import { normalizeExtractedText } from "@/lib/resume/extract";

describe("normalizeExtractedText", () => {
  test("collapses runs of spaces within a line", () => {
    expect(normalizeExtractedText("Led    a   team")).toBe("Led a team");
  });

  test("preserves single line breaks so bullets stay separate", () => {
    expect(normalizeExtractedText("Bullet one\nBullet two")).toBe(
      "Bullet one\nBullet two",
    );
  });

  test("collapses three or more blank lines into a paragraph break", () => {
    expect(normalizeExtractedText("Section\n\n\n\nNext")).toBe("Section\n\nNext");
  });

  test("normalizes Windows and classic Mac line endings", () => {
    expect(normalizeExtractedText("a\r\nb\rc")).toBe("a\nb\nc");
  });

  test("strips the non-breaking spaces pdf.js emits between glyphs", () => {
    expect(normalizeExtractedText("Power BI dashboards")).toBe(
      "Power BI dashboards",
    );
  });

  test("trims surrounding whitespace", () => {
    expect(normalizeExtractedText("\n\n  Resume  \n\n")).toBe("Resume");
  });

  test("removes trailing spaces before a newline", () => {
    expect(normalizeExtractedText("line one   \n   line two")).toBe(
      "line one\nline two",
    );
  });

  test("returns an empty string for whitespace-only input", () => {
    expect(normalizeExtractedText("   \n\n   ")).toBe("");
  });
});
