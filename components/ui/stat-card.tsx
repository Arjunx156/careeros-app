import Link from "next/link";
import { cn } from "@/lib/utils";

type StatCardProps = {
  label: string;
  /** Null renders an em dash — "no data yet" reads differently from zero. */
  value: number | null;
  suffix?: string;
  hint?: string;
  href?: string;
  emphasis?: "default" | "success" | "danger";
};

const EMPHASIS_CLASS: Record<
  NonNullable<StatCardProps["emphasis"]>,
  string
> = {
  default: "text-ink",
  success: "text-success",
  danger: "text-danger",
};

export function StatCard({
  label,
  value,
  suffix,
  hint,
  href,
  emphasis = "default",
}: StatCardProps) {
  const body = (
    <>
      <p className="text-label text-ink-secondary">{label}</p>
      <p
        className={cn(
          "tabular mt-1.5 text-[26px] leading-none font-bold tracking-[-0.02em]",
          value === null ? "text-ink-muted" : EMPHASIS_CLASS[emphasis],
        )}
      >
        {value === null ? "—" : value}
        {value !== null && suffix ? (
          <span className="ml-0.5 text-base font-semibold">{suffix}</span>
        ) : null}
      </p>
      {hint ? <p className="mt-1 text-label text-ink-muted">{hint}</p> : null}
    </>
  );

  if (href) {
    return (
      <Link href={href} className="card card-interactive block p-4">
        {body}
      </Link>
    );
  }

  return <div className="card p-4">{body}</div>;
}
