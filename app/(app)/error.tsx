"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Error boundary for the app shell.
 *
 * Shows what failed rather than a blank page or a stack trace. The digest is
 * surfaced because it is the only handle on the server-side log for a
 * production failure, where the real message is deliberately withheld.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] render failed:", error);
  }, [error]);

  return (
    <div className="card grid place-items-center px-6 py-14 text-center">
      <div className="grid size-11 place-items-center rounded-full bg-danger-bg text-danger">
        <AlertTriangle aria-hidden className="size-5" />
      </div>

      <h1 className="mt-4 text-page-title text-ink">This page could not load</h1>
      <p className="mt-1 max-w-md text-body text-ink-secondary">
        Something failed while rendering. Your data is not affected — retrying is
        safe.
      </p>

      {error.digest ? (
        <p className="mt-3 font-mono text-label text-ink-muted">
          Reference: {error.digest}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Button onClick={reset}>
          <RotateCw aria-hidden className="size-4" />
          Try again
        </Button>
        <Link
          href="/dashboard"
          className="inline-flex h-10 items-center rounded-[var(--radius-control)] border border-line bg-surface px-4 text-body font-medium text-ink-secondary transition-colors hover:bg-surface-hover hover:text-ink"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
