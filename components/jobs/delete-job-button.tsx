"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

type DeleteJobButtonProps = {
  jobId: string;
  company: string;
  role: string;
  /** Deleted along with the job — the reason this needs confirming at all. */
  analysisCount: number;
  /** Kept, but unlinked from the job. */
  applicationCount: number;
};

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

/** "analysis" does not pluralise by suffix, and it is the word that matters most here. */
function analyses(count: number): string {
  return count === 1 ? "1 analysis" : `${count} analyses`;
}

export function DeleteJobButton({
  jobId,
  company,
  role,
  analysisCount,
  applicationCount,
}: DeleteJobButtonProps) {
  const router = useRouter();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  async function deleteJob() {
    setIsPending(true);
    try {
      const response = await fetch(`/api/jobs/${jobId}`, { method: "DELETE" });
      if (!response.ok) throw new Error();

      toast.success(
        analysisCount > 0
          ? `Job deleted, along with ${analyses(analysisCount)}.`
          : "Job deleted.",
      );
      setIsConfirmOpen(false);
      router.refresh();
    } catch {
      toast.error("Could not delete. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <>
      <Button
        variant="dangerGhost"
        size="icon"
        onClick={() => setIsConfirmOpen(true)}
        disabled={isPending}
        aria-label={`Delete the ${company} ${role} job`}
      >
        <Trash2 aria-hidden className="size-3.5" />
      </Button>

      <Modal
        isOpen={isConfirmOpen}
        onClose={() => !isPending && setIsConfirmOpen(false)}
        title="Delete this job?"
        description={`${role} at ${company} will be permanently removed.`}
      >
        {analysisCount > 0 ? (
          <p className="mb-4 rounded-[var(--radius-control)] border border-danger/20 bg-danger-bg px-3 py-2.5 text-body text-ink-secondary">
            This will also permanently delete{" "}
            <span className="font-medium text-ink">{analyses(analysisCount)}</span>{" "}
            run against this job, including scores and action plan. This cannot
            be undone.
          </p>
        ) : null}

        {applicationCount > 0 ? (
          <p className="mb-4 rounded-[var(--radius-control)] border border-warning/20 bg-warning-bg px-3 py-2.5 text-body text-ink-secondary">
            <span className="font-medium text-ink">
              {plural(applicationCount, "application")}
            </span>{" "}
            will be kept, but will no longer point to this job.
          </p>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button
            variant="secondary"
            onClick={() => setIsConfirmOpen(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={deleteJob}
            isLoading={isPending}
            loadingText="Deleting…"
          >
            Delete permanently
          </Button>
        </div>
      </Modal>
    </>
  );
}
