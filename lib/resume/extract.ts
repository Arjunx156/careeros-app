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

/**
 * Collapse the ragged whitespace pdf.js emits, without destroying line
 * structure — and strip the control characters and stray surrogates PDF
 * text extraction occasionally leaves behind (null bytes and form feeds
 * from encoding artifacts, unpaired surrogates from broken font mappings).
 * Those survive whitespace normalization untouched, sit quietly in
 * extractedText, and only surface once this text is embedded in a Gemini
 * prompt (the judgment/synthesis stages, not extract — JD text is
 * user-typed and clean), where the API rejects the entire request as
 * malformed with no indication which field caused it.
 */
export function normalizeExtractedText(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    // C0 controls and DEL, excluding tab (0x09) and newline (0x0a).
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    // Lone surrogates only — a valid high/low pair (real astral-plane text) is left intact.
    .replace(/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/g, "")
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
