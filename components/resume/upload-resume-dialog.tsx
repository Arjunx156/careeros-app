"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Plus, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { MAX_RESUME_BYTES, validateResumeFile } from "@/lib/resume/schema";
import { cn } from "@/lib/utils";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function UploadResumeDialog({ isFirst }: { isFirst: boolean }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [isMaster, setIsMaster] = useState(isFirst);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function reset() {
    setFile(null);
    setName("");
    setIsMaster(isFirst);
    setErrors({});
    setIsDragging(false);
    formRef.current?.reset();
  }

  function close() {
    if (isSubmitting) return;
    setIsOpen(false);
    reset();
  }

  function acceptFile(candidate: File) {
    const error = validateResumeFile(candidate);
    if (error) {
      setErrors({ file: error });
      return;
    }

    setErrors({});
    setFile(candidate);

    // Pre-fill the name from the filename — almost always what you want, and
    // still editable.
    if (name.trim().length === 0) {
      setName(candidate.name.replace(/\.pdf$/i, "").slice(0, 120));
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file) {
      setErrors({ file: "Choose a PDF to upload." });
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    const body = new FormData();
    body.set("file", file);
    body.set("name", name);
    body.set("targetRole", (formRef.current?.targetRole as HTMLInputElement)?.value ?? "");
    body.set(
      "targetIndustry",
      (formRef.current?.targetIndustry as HTMLInputElement)?.value ?? "",
    );
    body.set("isMaster", String(isMaster));

    try {
      const response = await fetch("/api/resumes", { method: "POST", body });
      const payload = (await response.json()) as {
        ok: boolean;
        error?: string;
        fields?: Record<string, string>;
      };

      if (!response.ok || !payload.ok) {
        setErrors(payload.fields ?? { file: payload.error ?? "Upload failed." });
        // Extraction failures are the interesting case — surface them loudly,
        // because the fix is "export a different PDF", not "retry".
        if (payload.error) toast.error(payload.error);
        return;
      }

      toast.success("Resume added to your library.");
      setIsOpen(false);
      reset();
      router.refresh();
    } catch {
      toast.error("Connection error. Please check your internet and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        <Plus aria-hidden className="size-4" />
        Upload Resume
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={close}
        title="Upload a resume"
        description="PDF only, up to 10MB. Text is extracted on upload."
      >
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          {/* Dropzone */}
          <div>
            <div
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setIsDragging(false);
                const dropped = event.dataTransfer.files[0];
                if (dropped) acceptFile(dropped);
              }}
              className={cn(
                "rounded-[var(--radius-control)] border border-dashed px-4 py-6 text-center transition-colors",
                isDragging
                  ? "border-brand-400 bg-brand-50"
                  : errors.file
                    ? "border-danger bg-danger-bg"
                    : "border-line bg-canvas",
              )}
            >
              <FileUp
                aria-hidden
                className="mx-auto size-7 text-ink-muted"
                strokeWidth={1.5}
              />

              {file ? (
                <p className="mt-2 text-body text-ink">
                  <span className="font-medium">{file.name}</span>
                  <span className="text-ink-muted"> · {formatBytes(file.size)}</span>
                </p>
              ) : (
                <p className="mt-2 text-body text-ink-secondary">
                  Drag a PDF here, or
                </p>
              )}

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-1 text-body font-medium text-brand-600 hover:text-brand-700 hover:underline"
              >
                {file ? "Choose a different file" : "browse your files"}
              </button>

              <input
                ref={fileInputRef}
                id="file"
                type="file"
                accept="application/pdf,.pdf"
                className="sr-only"
                onChange={(event) => {
                  const chosen = event.target.files?.[0];
                  if (chosen) acceptFile(chosen);
                }}
              />
            </div>

            {errors.file ? (
              <p role="alert" className="mt-1.5 text-label text-danger">
                {errors.file}
              </p>
            ) : (
              <p className="mt-1.5 text-label text-ink-muted">
                Max {formatBytes(MAX_RESUME_BYTES)}. Scanned PDFs cannot be analyzed.
              </p>
            )}
          </div>

          <Field label="Version name" htmlFor="name" required error={errors.name}>
            <TextInput
              id="name"
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Business Analyst v4"
              aria-invalid={errors.name ? true : undefined}
              maxLength={120}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Target role" htmlFor="targetRole">
              <TextInput
                id="targetRole"
                name="targetRole"
                placeholder="e.g. Business Analyst"
                maxLength={120}
              />
            </Field>
            <Field label="Target industry" htmlFor="targetIndustry">
              <TextInput
                id="targetIndustry"
                name="targetIndustry"
                placeholder="e.g. Fintech"
                maxLength={120}
              />
            </Field>
          </div>

          <label
            className={cn(
              "flex cursor-pointer items-start gap-2.5 rounded-[var(--radius-control)] border p-3 transition-colors",
              isMaster ? "border-brand-200 bg-brand-50" : "border-line hover:bg-surface-hover",
            )}
          >
            <input
              type="checkbox"
              checked={isMaster}
              onChange={(event) => setIsMaster(event.target.checked)}
              className="mt-0.5 size-4 accent-[var(--color-brand-600)]"
            />
            <span className="min-w-0">
              <span className="flex items-center gap-1.5 text-body font-medium text-ink">
                <Star aria-hidden className="size-3.5" />
                Set as Master Resume
              </span>
              <span className="mt-0.5 block text-label text-ink-muted">
                The default selected in the Job Analyzer. Only one at a time.
              </span>
            </span>
          </label>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting} loadingText="Uploading…">
              Upload
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
