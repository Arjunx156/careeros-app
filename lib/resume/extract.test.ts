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
    expect(normalizeExtractedText("Power BI dashboards")).toBe(
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

  test("strips control characters PDF extraction leaves behind", () => {
    // Null byte and form feed are common encoding artifacts; \t and \n must
    // survive since they are meaningful whitespace, not noise. Built via
    // fromCharCode rather than string escapes so the raw bytes are unambiguous.
    const nul = String.fromCharCode(0);
    const formFeed = String.fromCharCode(12);
    const withControls = `Led${nul} a${formFeed} team\tof\n5`;
    // \t is collapsed to a space by the general whitespace pass, same as
    // any other run of spaces/tabs — only \n is preserved as a line break.
    expect(normalizeExtractedText(withControls)).toBe("Led a team of\n5");
  });

  test("strips a lone surrogate without touching a valid surrogate pair", () => {
    const loneHighSurrogate = String.fromCharCode(0xd83d);
    const validEmoji = String.fromCodePoint(0x1f600); // a real high+low pair, must survive
    expect(normalizeExtractedText(`Rating${loneHighSurrogate}: ${validEmoji}`)).toBe(
      `Rating: ${validEmoji}`,
    );
  });
});
