import Link from "next/link";
import type { LucideIcon } from "lucide-react";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; href: string };
};

/** Centered empty state per docs/04_UI_UX_Design_Brief.md. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="card grid place-items-center px-6 py-14 text-center">
      <Icon aria-hidden className="size-10 text-line" strokeWidth={1.5} />
      <h2 className="mt-4 text-card-title text-ink">{title}</h2>
      <p className="mt-1 max-w-sm text-body text-ink-secondary">{description}</p>
      {action ? (
        <Link
          href={action.href}
          className="mt-5 inline-flex h-10 items-center rounded-[var(--radius-control)] bg-brand-600 px-4 text-body font-medium text-white transition-colors hover:bg-brand-700"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
