"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

type ResumeActionsProps = {
  resumeId: string;
  resumeName: string;
  isMaster: boolean;
  usageCount: number;
};

export function ResumeActions({
  resumeId,
  resumeName,
  isMaster,
  usageCount,
}: ResumeActionsProps) {
  const router = useRouter();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  async function setAsMaster() {
    setIsPending(true);
    try {
      const response = await fetch(`/api/resumes/${resumeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isMaster: true }),
      });

      if (!response.ok) throw new Error();

      toast.success(`"${resumeName}" is now your master resume.`);
      router.refresh();
    } catch {
      toast.error("Could not update. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  async function deleteResume() {
    setIsPending(true);
    try {
      const response = await fetch(`/api/resumes/${resumeId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error();

      toast.success("Resume deleted.");
      router.push("/resume-library");
      router.refresh();
    } catch {
      toast.error("Could not delete. Please try again.");
      setIsPending(false);
    }
  }

  return (
    <>
      {!isMaster ? (
        <Button variant="secondary" onClick={setAsMaster} disabled={isPending}>
          <Star aria-hidden className="size-4" />
          Set as Master
        </Button>
      ) : null}

      <Button
        variant="secondary"
        onClick={() => setIsConfirmOpen(true)}
        disabled={isPending}
        aria-label={`Delete ${resumeName}`}
      >
        <Trash2 aria-hidden className="size-4 text-danger" />
        Delete
      </Button>

      <Modal
        isOpen={isConfirmOpen}
        onClose={() => !isPending && setIsConfirmOpen(false)}
        title="Delete this resume?"
        description={`"${resumeName}" and its uploaded file will be permanently removed.`}
      >
        {usageCount > 0 ? (
          <p className="mb-4 rounded-[var(--radius-control)] border border-warning/20 bg-warning-bg px-3 py-2.5 text-body text-ink-secondary">
            This version is linked to{" "}
            <span className="font-medium text-ink">
              {usageCount} {usageCount === 1 ? "record" : "records"}
            </span>
            . Those analyses and applications will remain, but will no longer
            point to a resume.
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
            onClick={deleteResume}
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
