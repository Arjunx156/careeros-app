"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, LockKeyhole } from "lucide-react";

export function UnlockForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(data.error ?? "Something went wrong. Try again.");
        setPassword("");
        return;
      }

      const next = searchParams.get("next");
      router.replace(next?.startsWith("/") ? next : "/dashboard");
      router.refresh();
    } catch {
      setError("Connection error. Check your internet and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card p-6">
      <label
        htmlFor="password"
        className="mb-2 block text-label font-medium text-ink-secondary"
      >
        Password
      </label>

      <div className="relative">
        <LockKeyhole
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted"
        />
        <input
          id="password"
          name="password"
          type="password"
          autoFocus
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "unlock-error" : undefined}
          className="h-10 w-full rounded-[var(--radius-control)] border border-line bg-surface pr-3 pl-9 text-body text-ink transition-colors placeholder:text-ink-muted focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none"
          placeholder="Enter your password"
        />
      </div>

      {error ? (
        <p
          id="unlock-error"
          role="alert"
          className="mt-2 text-label text-danger"
        >
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting || password.length === 0}
        className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-[var(--radius-control)] bg-brand-600 text-body font-medium text-white transition-colors hover:bg-brand-700 focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? (
          <>
            <Loader2 aria-hidden className="size-4 animate-spin" />
            Unlocking…
          </>
        ) : (
          "Unlock"
        )}
      </button>

      <p className="mt-4 text-label text-ink-muted">
        Set <code className="font-mono">APP_PASSWORD</code> in your environment
        to change this.
      </p>
    </form>
  );
}
