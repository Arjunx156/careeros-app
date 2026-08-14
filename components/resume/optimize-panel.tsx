"use client";

import { useState } from "react";
import { Download, FileText, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type GeneratedResume = {
  id: string;
  name: string;
  pdfUrl: string | null;
  docxUrl: string | null;
  removedCount?: number;
};

export function OptimizePanel({
  analysisId,
  existing,
  isComplete,
}: {
  analysisId: string;
  existing: GeneratedResume[];
  isComplete: boolean;
}) {
  const [results, setResults] = useState<GeneratedResume[]>(existing);
  const [isGenerating, setIsGenerating] = useState(false);

  const latest = results[0] ?? null;

  async function generate() {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/optimized-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisId }),
      });
      const payload = (await response.json()) as {
        ok: boolean;
        error?: string;
        data?: GeneratedResume;
      };

      if (!response.ok || !payload.ok || !payload.data) {
        toast.error(payload.error ?? "Could not generate the resume.");
        return;
      }

      setResults((current) => [payload.data as GeneratedResume, ...current]);

      const removed = payload.data.removedCount ?? 0;
      if (removed > 0) {
        toast.success(
          `Resume generated. ${removed} unverifiable ${removed === 1 ? "item was" : "items were"} removed.`,
        );
      } else {
        toast.success("Resume generated. Every fact traced back to your original.");
      }
    } catch {
      toast.error("Connection error. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <section className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-section text-ink">Optimized resume</h2>
          <p className="mt-0.5 text-body text-ink-secondary">
            Rewritten for this role. Wording and emphasis change; your facts do not.
          </p>
        </div>

        <Button
          onClick={generate}
          isLoading={isGenerating}
          loadingText="Generating…"
          disabled={!isComplete}
        >
          <Sparkles aria-hidden className="size-4" />
          {latest ? "Generate again" : "Generate"}
        </Button>
      </div>

      {!isComplete ? (
        <p className="mt-4 rounded-[var(--radius-control)] bg-warning-bg px-3 py-2.5 text-body text-ink-secondary">
          Finish the analysis first — the optimizer works from its findings.
        </p>
      ) : null}

      {latest ? (
        <div className="mt-5 rounded-[var(--radius-control)] border border-line p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-control)] bg-brand-50 text-brand-600">
                <FileText aria-hidden className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-card-title text-ink">{latest.name}</p>
                <p className="text-label text-ink-muted">
                  {results.length} version{results.length === 1 ? "" : "s"} generated
                </p>
              </div>
            </div>

            <div className="flex shrink-0 gap-2">
              {latest.pdfUrl ? (
                <a
                  href={latest.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-control)] border border-line bg-surface px-3 text-label font-medium text-ink-secondary transition-colors hover:bg-surface-hover hover:text-ink"
                >
                  <Download aria-hidden className="size-3.5" />
                  PDF
                </a>
              ) : null}
              {latest.docxUrl ? (
                <a
                  href={latest.docxUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-control)] border border-line bg-surface px-3 text-label font-medium text-ink-secondary transition-colors hover:bg-surface-hover hover:text-ink"
                >
                  <Download aria-hidden className="size-3.5" />
                  DOCX
                </a>
              ) : null}
            </div>
          </div>

          {typeof latest.removedCount === "number" ? (
            latest.removedCount > 0 ? (
              <p className="mt-3 flex items-start gap-2 rounded-[var(--radius-badge)] bg-warning-bg px-2.5 py-2 text-label text-ink-secondary">
                <Trash2 aria-hidden className="mt-0.5 size-3.5 shrink-0 text-warning" />
                <span>
                  <span className="font-medium text-ink">
                    {latest.removedCount} item
                    {latest.removedCount === 1 ? "" : "s"} removed.
                  </span>{" "}
                  The AI wrote something that could not be traced back to your
                  original resume, so it was stripped rather than shipped.
                </span>
              </p>
            ) : (
              <p className="mt-3 flex items-center gap-2 rounded-[var(--radius-badge)] bg-success-bg px-2.5 py-2 text-label text-ink-secondary">
                <ShieldCheck aria-hidden className="size-3.5 shrink-0 text-success" />
                Every employer, date, figure and skill traced back to your original.
              </p>
            )
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
