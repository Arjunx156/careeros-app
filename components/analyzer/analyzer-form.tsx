"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Microscope, RotateCw, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Select, TextArea, TextInput } from "@/components/ui/field";
import { cn } from "@/lib/utils";

type ResumeOption = {
  id: string;
  name: string;
  isMaster: boolean;
  hasText: boolean;
};

const MIN_JD_LENGTH = 100;

type RunState =
  | { phase: "idle" }
  | { phase: "running"; analysisId: string; stage: number; label: string }
  | { phase: "failed"; analysisId: string; stage: number; error: string };

export function AnalyzerForm({
  resumes,
  stageLabels,
}: {
  resumes: ResumeOption[];
  stageLabels: string[];
}) {
  const router = useRouter();
  const abortRef = useRef(false);

  const defaultResume =
    resumes.find((resume) => resume.isMaster && resume.hasText) ??
    resumes.find((resume) => resume.hasText);

  const [resumeId, setResumeId] = useState(defaultResume?.id ?? "");
  const [jdText, setJdText] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [run, setRun] = useState<RunState>({ phase: "idle" });

  const totalStages = stageLabels.length;

  /**
   * Drive the pipeline one stage per request.
   *
   * Each call persists its own results, so a failure here loses only the
   * current stage — resuming picks up exactly where it stopped.
   */
  const advance = useCallback(
    async (analysisId: string, startStage: number) => {
      let stage = startStage;

      while (stage < totalStages) {
        if (abortRef.current) return;

        setRun({
          phase: "running",
          analysisId,
          stage,
          label: stageLabels[stage] ?? "Working",
        });

        let response: Response;
        try {
          response = await fetch(`/api/analyses/${analysisId}/advance`, {
            method: "POST",
          });
        } catch {
          setRun({
            phase: "failed",
            analysisId,
            stage,
            error: "Connection error. Check your internet and retry.",
          });
          return;
        }

        const payload = (await response.json().catch(() => ({}))) as {
          ok?: boolean;
          error?: string;
          data?: { stage: number; done: boolean };
        };

        if (!response.ok || !payload.ok || !payload.data) {
          setRun({
            phase: "failed",
            analysisId,
            stage,
            error: payload.error ?? "That step failed.",
          });
          return;
        }

        stage = payload.data.stage;

        if (payload.data.done) {
          toast.success("Analysis complete.");
          router.push(`/job-analyzer/${analysisId}`);
          router.refresh();
          return;
        }
      }
    },
    [router, stageLabels, totalStages],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: Record<string, string> = {};
    if (!resumeId) nextErrors.resumeId = "Select a resume.";
    if (jdText.trim().length < MIN_JD_LENGTH) {
      nextErrors.jdText = `Paste the full job description — at least ${MIN_JD_LENGTH} characters.`;
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    abortRef.current = false;
    setRun({ phase: "running", analysisId: "", stage: 0, label: stageLabels[0] });

    try {
      const response = await fetch("/api/analyses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeVersionId: resumeId, jdText, company, role }),
      });

      const payload = (await response.json()) as {
        ok: boolean;
        error?: string;
        fields?: Record<string, string>;
        data?: { id: string };
      };

      if (!response.ok || !payload.ok || !payload.data) {
        setErrors(payload.fields ?? {});
        toast.error(payload.error ?? "Could not start the analysis.");
        setRun({ phase: "idle" });
        return;
      }

      await advance(payload.data.id, 0);
    } catch {
      toast.error("Connection error. Please try again.");
      setRun({ phase: "idle" });
    }
  }

  function cancel() {
    abortRef.current = true;
    setRun({ phase: "idle" });
  }

  const usableResumes = resumes.filter((resume) => resume.hasText);

  if (usableResumes.length === 0) {
    return (
      <div className="card p-6 text-center">
        <Microscope
          aria-hidden
          className="mx-auto size-10 text-line"
          strokeWidth={1.5}
        />
        <h2 className="mt-4 text-card-title text-ink">No analyzable resume yet</h2>
        <p className="mx-auto mt-1 max-w-sm text-body text-ink-secondary">
          Upload a text-based PDF to your library first — the analyzer reads the
          extracted text, so a resume without it cannot be scored.
        </p>
        <Button
          className="mt-5"
          onClick={() => router.push("/resume-library")}
        >
          Go to Resume Library
        </Button>
      </div>
    );
  }

  // ─── Progress view ─────────────────────────────────────────────────────────
  if (run.phase === "running" || run.phase === "failed") {
    const currentStage = run.stage;

    return (
      <div className="card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-section text-ink">
              {run.phase === "failed" ? "Analysis paused" : "Analyzing…"}
            </h2>
            <p className="mt-0.5 text-body text-ink-secondary">
              {run.phase === "failed"
                ? "Only this step failed. Everything before it is saved."
                : "This takes 60–90 seconds. Each step is saved as it completes."}
            </p>
          </div>
          {run.phase === "running" ? (
            <Button variant="ghost" size="sm" onClick={cancel}>
              <X aria-hidden className="size-4" />
              Cancel
            </Button>
          ) : null}
        </div>

        <ol className="mt-5 space-y-1.5">
          {stageLabels.map((label, index) => {
            const isDone = index < currentStage;
            const isCurrent = index === currentStage;
            const isFailed = run.phase === "failed" && isCurrent;

            return (
              <li
                key={label}
                className={cn(
                  "flex items-center gap-2.5 rounded-[var(--radius-control)] px-3 py-2 text-body transition-colors",
                  isCurrent && !isFailed && "bg-brand-50 text-brand-700",
                  isFailed && "bg-danger-bg text-danger",
                  isDone && "text-ink-secondary",
                  !isDone && !isCurrent && "text-ink-muted",
                )}
              >
                <span className="grid size-4 shrink-0 place-items-center">
                  {isDone ? (
                    <Check aria-hidden className="size-4 text-success" />
                  ) : isFailed ? (
                    <X aria-hidden className="size-4" />
                  ) : isCurrent ? (
                    <Loader2 aria-hidden className="size-4 animate-spin" />
                  ) : (
                    <span
                      aria-hidden
                      className="size-1.5 rounded-full bg-line"
                    />
                  )}
                </span>
                {label}
              </li>
            );
          })}
        </ol>

        {run.phase === "failed" ? (
          <div className="mt-5">
            <p className="rounded-[var(--radius-control)] border border-danger/20 bg-danger-bg px-3 py-2.5 text-body text-danger">
              {run.error}
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                onClick={() => {
                  abortRef.current = false;
                  void advance(run.analysisId, run.stage);
                }}
              >
                <RotateCw aria-hidden className="size-4" />
                Retry this step
              </Button>
              <Button
                variant="secondary"
                onClick={() => router.push(`/job-analyzer/${run.analysisId}`)}
              >
                View partial results
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  // ─── Input view ────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="card space-y-4 p-5 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Resume"
          htmlFor="resumeId"
          required
          error={errors.resumeId}
          hint="Your master resume is selected by default."
        >
          <Select
            id="resumeId"
            value={resumeId}
            onChange={(event) => setResumeId(event.target.value)}
            aria-invalid={errors.resumeId ? true : undefined}
          >
            {usableResumes.map((resume) => (
              <option key={resume.id} value={resume.id}>
                {resume.name}
                {resume.isMaster ? " (Master)" : ""}
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Company" htmlFor="company">
            <TextInput
              id="company"
              value={company}
              onChange={(event) => setCompany(event.target.value)}
              placeholder="e.g. Stripe"
              maxLength={200}
            />
          </Field>
          <Field label="Role" htmlFor="role">
            <TextInput
              id="role"
              value={role}
              onChange={(event) => setRole(event.target.value)}
              placeholder="e.g. Business Analyst"
              maxLength={200}
            />
          </Field>
        </div>
      </div>

      <Field
        label="Job description"
        htmlFor="jdText"
        required
        error={errors.jdText}
        hint={`${jdText.length.toLocaleString()} characters — paste the whole posting for the best analysis.`}
      >
        <TextArea
          id="jdText"
          value={jdText}
          onChange={(event) => setJdText(event.target.value)}
          rows={12}
          placeholder="Paste the full job description here, including requirements and responsibilities…"
          aria-invalid={errors.jdText ? true : undefined}
        />
      </Field>

      <div className="flex justify-end">
        <Button type="submit" size="lg">
          <Microscope aria-hidden className="size-4" />
          Analyze match
        </Button>
      </div>
    </form>
  );
}
