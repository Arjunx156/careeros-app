import { Hammer } from "lucide-react";

type PhasePlaceholderProps = {
  /** What this page will do once built — written as a promise, not a TODO. */
  summary: string;
  /** The build checkpoint that delivers it. */
  checkpoint: string;
  features: string[];
};

/**
 * Honest placeholder for routes whose checkpoint has not landed yet.
 *
 * The route exists so navigation is complete and nothing 404s, but it states
 * plainly that the feature is not built rather than showing fake data.
 */
export function PhasePlaceholder({
  summary,
  checkpoint,
  features,
}: PhasePlaceholderProps) {
  return (
    <div className="card p-6">
      <div className="flex items-start gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-control)] bg-warning-bg text-warning">
          <Hammer aria-hidden className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="text-card-title text-ink">Not built yet</p>
          <p className="mt-1 text-body text-ink-secondary">{summary}</p>
          <p className="mt-3 inline-flex items-center rounded-[var(--radius-badge)] border border-warning/20 bg-warning-bg px-2 py-1 text-label font-medium text-warning">
            Arrives in {checkpoint}
          </p>

          <ul className="mt-4 space-y-1.5">
            {features.map((feature) => (
              <li
                key={feature}
                className="flex gap-2 text-body text-ink-secondary"
              >
                <span aria-hidden className="text-ink-muted">
                  •
                </span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
