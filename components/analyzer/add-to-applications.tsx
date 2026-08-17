"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { BriefcaseBusiness, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Select, TextArea, TextInput } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import {
  APPLICATION_METHODS,
  APPLICATION_STATUSES,
  STATUS_CONFIG,
} from "@/lib/applications/status";
import { BAND_TEXT, scoreBand } from "@/lib/score";
import { cn } from "@/lib/utils";

type AddToApplicationsProps = {
  analysisId: string;
  jobDescriptionId: string;
  company: string;
  role: string;
  /** Copied onto the application so the pipeline shows what it scored. */
  matchScore: number | null;
  /** The resume this analysis ran against — the one actually being sent. */
  resumeVersionId: string;
  resumeName: string;
  /** Set when this job is already tracked, which turns the button into a link. */
  existingApplicationId: string | null;
};

export function AddToApplications({
  analysisId,
  jobDescriptionId,
  company,
  role,
  matchScore,
  resumeVersionId,
  resumeName,
  existingApplicationId,
}: AddToApplicationsProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Held in state rather than computed at render: the modal is in the tree
  // from first paint, and a server/client date disagreement across midnight
  // would be a hydration mismatch.
  const [applicationDate, setApplicationDate] = useState("");

  function open() {
    setApplicationDate(format(new Date(), "yyyy-MM-dd"));
    setErrors({});
    setIsOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    const form = new FormData(event.currentTarget);
    const value = (key: string) => String(form.get(key) ?? "");

    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company,
          role,
          status: value("status"),
          applicationDate,
          applicationMethod: value("applicationMethod") || null,
          nextFollowupDate: value("nextFollowupDate"),
          notes: value("notes"),
          coverLetterUsed: form.get("coverLetterUsed") === "on",
          // The whole point of starting here rather than from a blank form:
          // the application stays joined to the job, the analysis, the resume
          // that was scored, and the score itself.
          jobDescriptionId,
          analysisId,
          resumeVersionId,
          matchScore,
        }),
      });

      const payload = (await response.json()) as {
        ok: boolean;
        error?: string;
        fields?: Record<string, string>;
        data?: { id: string };
      };

      if (!response.ok || !payload.ok || !payload.data) {
        setErrors(payload.fields ?? {});
        toast.error(payload.error ?? "Could not add that application.");
        return;
      }

      toast.success(`${company} added to your applications.`);
      setIsOpen(false);
      router.push(`/applications/${payload.data.id}`);
      router.refresh();
    } catch {
      toast.error("Connection error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Already tracked — offer the way there instead of a second copy.
  if (existingApplicationId) {
    return (
      <Link
        href={`/applications/${existingApplicationId}`}
        className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-control)] border border-line bg-surface px-4 text-body font-medium text-ink-secondary transition-colors hover:bg-surface-hover hover:text-ink"
      >
        <Check aria-hidden className="size-4 text-success" />
        In applications
      </Link>
    );
  }

  return (
    <>
      <Button onClick={open}>
        <BriefcaseBusiness aria-hidden className="size-4" />
        Add to Applications
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={() => !isSubmitting && setIsOpen(false)}
        title="Track this application"
        description="The job, this analysis and the resume you scored stay linked to it."
        className="sm:max-w-xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-[var(--radius-control)] border border-line bg-canvas px-3 py-2.5">
            <p className="text-body font-medium text-ink">{company}</p>
            <p className="text-label text-ink-secondary">{role}</p>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-label text-ink-muted">
              <span>
                Resume: <span className="text-ink-secondary">{resumeName}</span>
              </span>
              {matchScore !== null ? (
                <span>
                  Match:{" "}
                  <span
                    className={cn("tabular font-semibold", BAND_TEXT[scoreBand(matchScore)])}
                  >
                    {matchScore}
                  </span>
                </span>
              ) : null}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Status" htmlFor="status" error={errors.status}>
              <Select id="status" name="status" defaultValue="applied">
                {APPLICATION_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_CONFIG[status].label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Applied on" htmlFor="applicationDate" error={errors.applicationDate}>
              <TextInput
                id="applicationDate"
                name="applicationDate"
                type="date"
                value={applicationDate}
                onChange={(event) => setApplicationDate(event.target.value)}
              />
            </Field>
            <Field label="Method" htmlFor="applicationMethod">
              <Select id="applicationMethod" name="applicationMethod" defaultValue="">
                <option value="">—</option>
                {APPLICATION_METHODS.map((method) => (
                  <option key={method.value} value={method.value}>
                    {method.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field
            label="Follow up on"
            htmlFor="nextFollowupDate"
            error={errors.nextFollowupDate}
          >
            <TextInput id="nextFollowupDate" name="nextFollowupDate" type="date" />
          </Field>

          <Field label="Notes" htmlFor="notes">
            <TextArea id="notes" name="notes" rows={3} maxLength={10_000} />
          </Field>

          <label className="flex items-center gap-2.5 text-body text-ink">
            <input
              type="checkbox"
              name="coverLetterUsed"
              className="size-4 accent-[var(--color-brand-600)]"
            />
            Sent a cover letter
          </label>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting} loadingText="Adding…">
              Add application
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
