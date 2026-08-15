import "server-only";

import { PDFParse } from "pdf-parse";

/**
 * A text-based resume PDF has far more than this. Anything below it is almost
 * certainly a scan (an image with no text layer) or a corrupt file — either
 * way we cannot analyse it, so we reject at upload rather than producing a
 * meaningless analysis later.
 */
const MIN_EXTRACTABLE_CHARS = 200;

export type ExtractionSuccess = {
  ok: true;
  text: string;
  pageCount: number;
  charCount: number;
};

export type ExtractionFailure = {
  ok: false;
  reason: "scanned" | "encrypted" | "corrupt";
  message: string;
};

export type ExtractionResult = ExtractionSuccess | ExtractionFailure;

/** Collapse the ragged whitespace pdf.js emits, without destroying line structure. */
export function normalizeExtractedText(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function extractPdfText(data: Buffer): Promise<ExtractionResult> {
  let parser: PDFParse | undefined;

  try {
    parser = new PDFParse({ data: new Uint8Array(data) });
    const result = await parser.getText();
    const text = normalizeExtractedText(result.text ?? "");

    if (text.length < MIN_EXTRACTABLE_CHARS) {
      return {
        ok: false,
        reason: "scanned",
        message:
          "This PDF appears to be scanned. Please upload a text-based PDF.",
      };
    }

    return {
      ok: true,
      text,
      pageCount: result.total ?? result.pages?.length ?? 0,
      charCount: text.length,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    // The client only ever sees the friendly reason below — log the real
    // cause server-side or every "corrupt" report is a dead end.
    console.error("[extract] pdf-parse failed:", error);

    if (/password|encrypt/i.test(message)) {
      return {
        ok: false,
        reason: "encrypted",
        message:
          "This PDF is password-protected. Remove the password and try again.",
      };
    }

    return {
      ok: false,
      reason: "corrupt",
      message: "This file could not be read as a PDF. Try re-exporting it.",
    };
  } finally {
    await parser?.destroy().catch(() => {});
  }
}
