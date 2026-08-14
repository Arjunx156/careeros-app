"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { runPipeline } from "@/lib/analysis/advance-client";
import {
  STAGE_LABELS_CLIENT,
  TOTAL_STAGES_CLIENT,
} from "@/lib/analysis/stage-labels";

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

    const result = await runPipeline({
      analysisId,
      fromStage,
      totalStages: TOTAL_STAGES_CLIENT,
      onStage: (stage, attempt) => {
        const base = STAGE_LABELS_CLIENT[stage] ?? "Working";
        setLabel(attempt > 0 ? `${base} (retry ${attempt})` : base);
      },
    });

    setIsRunning(false);
    setLabel(null);

    if (result.status === "done") {
      toast.success("Analysis complete.");
    } else {
      toast.error(result.message);
    }

    // Refresh either way — a failed run still advanced through earlier stages.
    router.refresh();
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
