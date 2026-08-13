"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { STAGE_LABELS_CLIENT } from "@/lib/analysis/stage-labels";

/**
 * Resumes a partially-complete analysis from where it stopped.
 *
 * Because each stage persisted its own results, this re-runs only the missing
 * steps rather than the whole pipeline.
 */
export function ResumeAnalysisResume({
  analysisId,
  fromStage,
}: {
  analysisId: string;
  fromStage: number;
}) {
  const router = useRouter();
  const [isRunning, setIsRunning] = useState(false);
  const [label, setLabel] = useState<string | null>(null);

  async function resume() {
    setIsRunning(true);
    let stage = fromStage;

    try {
      while (stage < STAGE_LABELS_CLIENT.length) {
        setLabel(STAGE_LABELS_CLIENT[stage] ?? null);

        const response = await fetch(`/api/analyses/${analysisId}/advance`, {
          method: "POST",
        });
        const payload = (await response.json().catch(() => ({}))) as {
          ok?: boolean;
          error?: string;
          data?: { stage: number; done: boolean };
        };

        if (!response.ok || !payload.ok || !payload.data) {
          toast.error(payload.error ?? "That step failed again.");
          return;
        }

        stage = payload.data.stage;
        if (payload.data.done) {
          toast.success("Analysis complete.");
          router.refresh();
          return;
        }
      }
    } catch {
      toast.error("Connection error. Please try again.");
    } finally {
      setIsRunning(false);
      setLabel(null);
    }
  }

  return (
    <Button
      size="sm"
      onClick={resume}
      isLoading={isRunning}
      loadingText={label ?? "Resuming…"}
    >
      <RotateCw aria-hidden className="size-4" />
      Finish analysis
    </Button>
  );
}
