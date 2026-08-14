"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Select, TextArea, TextInput } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import {
  APPLICATION_METHODS,
  APPLICATION_STATUSES,
  STATUS_CONFIG,
  WORK_TYPES,
} from "@/lib/applications/status";

type ResumeOption = { id: string; name: string };

export function AddApplicationDialog({ resumes }: { resumes: ResumeOption[] }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

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
          company: value("company"),
          role: value("role"),
          status: value("status"),
          location: value("location"),
          country: value("country"),
          workType: value("workType") || null,
          jobUrl: value("jobUrl"),
          salaryMin: value("salaryMin"),
          salaryMax: value("salaryMax"),
          applicationDate: value("applicationDate"),
          applicationMethod: value("applicationMethod") || null,
          resumeVersionId: value("resumeVersionId"),
          recruiterName: value("recruiterName"),
          nextFollowupDate: value("nextFollowupDate"),
          notes: value("notes"),
          coverLetterUsed: form.get("coverLetterUsed") === "on",
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
        toast.error(payload.error ?? "Could not save that application.");
        return;
      }

      toast.success("Application added.");
      setIsOpen(false);
      router.push(`/applications/${payload.data.id}`);
      router.refresh();
    } catch {
      toast.error("Connection error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        <Plus aria-hidden className="size-4" />
        Add Application
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={() => !isSubmitting && setIsOpen(false)}
        title="Add an application"
        description="Only company and role are required — fill in the rest as you learn it."
        className="sm:max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Company" htmlFor="company" required error={errors.company}>
              <TextInput id="company" name="company" autoFocus maxLength={120} />
            </Field>
            <Field label="Role" htmlFor="role" required error={errors.role}>
              <TextInput id="role" name="role" maxLength={160} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Status" htmlFor="status">
              <Select id="status" name="status" defaultValue="applied">
                {APPLICATION_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_CONFIG[status].label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Applied on" htmlFor="applicationDate">
              <TextInput id="applicationDate" name="applicationDate" type="date" />
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

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Location" htmlFor="location">
              <TextInput id="location" name="location" maxLength={120} />
            </Field>
            <Field label="Country" htmlFor="country">
              <TextInput id="country" name="country" maxLength={80} />
            </Field>
            <Field label="Work type" htmlFor="workType">
              <Select id="workType" name="workType" defaultValue="">
                <option value="">—</option>
                {WORK_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Resume used" htmlFor="resumeVersionId">
              <Select id="resumeVersionId" name="resumeVersionId" defaultValue="">
                <option value="">—</option>
                {resumes.map((resume) => (
                  <option key={resume.id} value={resume.id}>
                    {resume.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Follow up on" htmlFor="nextFollowupDate">
              <TextInput id="nextFollowupDate" name="nextFollowupDate" type="date" />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Salary min" htmlFor="salaryMin">
              <TextInput id="salaryMin" name="salaryMin" inputMode="numeric" />
            </Field>
            <Field label="Salary max" htmlFor="salaryMax">
              <TextInput id="salaryMax" name="salaryMax" inputMode="numeric" />
            </Field>
          </div>

          <Field label="Job URL" htmlFor="jobUrl">
            <TextInput id="jobUrl" name="jobUrl" type="url" placeholder="https://" />
          </Field>

          <Field label="Recruiter" htmlFor="recruiterName">
            <TextInput id="recruiterName" name="recruiterName" maxLength={120} />
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
            <Button type="submit" isLoading={isSubmitting} loadingText="Saving…">
              Add application
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
