"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Copy, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, TextArea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { MESSAGE_TYPES, type MessageTypeValue } from "@/lib/contacts/status";
import { cn } from "@/lib/utils";

type Generated = {
  message: string;
  subject: string;
  personalizationUsed: string[];
  characterCount: number;
  bannedPhrases: string[];
};

/** LinkedIn rejects connection notes over this. */
const CONNECTION_LIMIT = 300;

export function MessageDrawer({
  contactId,
  contactName,
}: {
  contactId: string;
  contactName: string;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<MessageTypeValue>("connection_request");
  const [extraContext, setExtraContext] = useState("");
  const [generated, setGenerated] = useState<Generated | null>(null);
  const [draft, setDraft] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const activeType = MESSAGE_TYPES.find((item) => item.value === type);
  const isOverLimit =
    type === "connection_request" && draft.length > CONNECTION_LIMIT;

  async function generate() {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId, type, extraContext }),
      });
      const payload = (await response.json()) as {
        ok: boolean;
        error?: string;
        data?: Generated;
      };

      if (!response.ok || !payload.ok || !payload.data) {
        toast.error(payload.error ?? "Could not generate a message.");
        return;
      }

      setGenerated(payload.data);
      setDraft(payload.data.message);
    } catch {
      toast.error("Connection error. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function save(markSent: boolean) {
    setIsSaving(true);
    try {
      const response = await fetch("/api/messages", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId, type, content: draft, markSent }),
      });
      if (!response.ok) throw new Error();

      toast.success(markSent ? "Logged as sent." : "Saved as a draft.");
      setIsOpen(false);
      setGenerated(null);
      setDraft("");
      router.refresh();
    } catch {
      toast.error("Could not save that message.");
    } finally {
      setIsSaving(false);
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(draft);
    toast.success("Copied.");
  }

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        <Sparkles aria-hidden className="size-4" />
        Generate message
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={() => !isGenerating && !isSaving && setIsOpen(false)}
        title={`Message ${contactName}`}
        description="Written from your resume, so it only claims things you have actually done."
        className="sm:max-w-2xl"
      >
        <div className="space-y-4">
          <div>
            <p className="section-label mb-2">Message type</p>
            <div className="flex flex-wrap gap-1.5">
              {MESSAGE_TYPES.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setType(item.value)}
                  aria-pressed={type === item.value}
                  className={cn(
                    "rounded-[var(--radius-badge)] border px-2.5 py-1 text-label font-medium transition-colors",
                    type === item.value
                      ? "border-brand-200 bg-brand-50 text-brand-700"
                      : "border-line bg-surface text-ink-secondary hover:bg-surface-hover",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
            {activeType ? (
              <p className="mt-1.5 text-label text-ink-muted">{activeType.hint}</p>
            ) : null}
          </div>

          <Field
            label="Anything you know about them"
            htmlFor="extraContext"
            hint="Paste their bio, a recent post, or a mutual connection. The more specific this is, the less generic the message."
          >
            <TextArea
              id="extraContext"
              rows={3}
              value={extraContext}
              onChange={(event) => setExtraContext(event.target.value)}
              maxLength={4000}
            />
          </Field>

          <Button
            onClick={generate}
            isLoading={isGenerating}
            loadingText="Writing…"
            className="w-full"
          >
            <Sparkles aria-hidden className="size-4" />
            {generated ? "Write another" : "Write it"}
          </Button>

          {generated ? (
            <div className="space-y-3 border-t border-line pt-4">
              <Field label="Draft" htmlFor="draft">
                <TextArea
                  id="draft"
                  rows={7}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  className="font-normal"
                />
              </Field>

              <div className="flex flex-wrap items-center justify-between gap-2 text-label">
                <span
                  className={cn(
                    "tabular",
                    isOverLimit ? "font-medium text-danger" : "text-ink-muted",
                  )}
                >
                  {draft.length} characters
                  {type === "connection_request" ? ` / ${CONNECTION_LIMIT}` : ""}
                </span>

                {generated.personalizationUsed.length > 0 ? (
                  <span className="text-ink-muted">
                    Personalized on: {generated.personalizationUsed.join(", ")}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-warning">
                    <AlertTriangle aria-hidden className="size-3" />
                    Nothing specific to them — add context above
                  </span>
                )}
              </div>

              {generated.bannedPhrases.length > 0 ? (
                <p className="flex items-start gap-2 rounded-[var(--radius-badge)] bg-warning-bg px-2.5 py-2 text-label text-ink-secondary">
                  <AlertTriangle aria-hidden className="mt-0.5 size-3.5 shrink-0 text-warning" />
                  <span>
                    This slipped into a stock opener ({generated.bannedPhrases.join(", ")}).
                    Rewrite that line before sending.
                  </span>
                </p>
              ) : null}

              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="secondary" onClick={copy}>
                  <Copy aria-hidden className="size-4" />
                  Copy
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => save(false)}
                  disabled={isSaving}
                >
                  Save draft
                </Button>
                <Button
                  onClick={() => save(true)}
                  isLoading={isSaving}
                  loadingText="Saving…"
                >
                  <Check aria-hidden className="size-4" />
                  I sent this
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </Modal>
    </>
  );
}
