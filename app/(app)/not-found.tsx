import Link from "next/link";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="card grid place-items-center px-6 py-14 text-center">
      <FileQuestion aria-hidden className="size-10 text-line" strokeWidth={1.5} />
      <h1 className="mt-4 text-page-title text-ink">Not found</h1>
      <p className="mt-1 max-w-md text-body text-ink-secondary">
        That record does not exist, or it was deleted.
      </p>
      <Link
        href="/dashboard"
        className="mt-5 inline-flex h-10 items-center rounded-[var(--radius-control)] bg-brand-600 px-4 text-body font-medium text-white transition-colors hover:bg-brand-700"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
