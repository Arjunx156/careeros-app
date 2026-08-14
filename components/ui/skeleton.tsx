import { cn } from "@/lib/utils";

/**
 * Skeleton placeholder.
 *
 * The design brief asks for skeletons rather than spinners: a shape that
 * matches the content tells you what is arriving, where a spinner only tells
 * you to wait. Marked aria-hidden with a polite live region alongside, so a
 * screen reader hears "loading" once instead of reading decorative boxes.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("skeleton", className)}>
      <span className="skeleton-shimmer" />
    </div>
  );
}

export function LoadingRegion({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

/** Header block shared by every route-level skeleton. */
export function PageHeaderSkeleton() {
  return (
    <div className="mb-6">
      <Skeleton className="h-7 w-full max-w-52" />
      <Skeleton className="mt-2 h-4 w-full max-w-80" />
    </div>
  );
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="card p-5">
          <Skeleton className="size-9 rounded-[var(--radius-control)]" />
          <Skeleton className="mt-3 h-4 w-3/5" />
          <Skeleton className="mt-2 h-3 w-2/5" />
          <Skeleton className="mt-4 h-3 w-1/3" />
          {/* Percentages already scale; nothing here needs a pixel width. */}
        </div>
      ))}
    </div>
  );
}

export function StatGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="card p-4">
          <Skeleton className="h-3 w-full max-w-24" />
          <Skeleton className="mt-2 h-7 w-14" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="card p-4">
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="flex items-center gap-4 border-b border-line-subtle py-3 last:border-0"
        >
          {/* Proportional, not fixed: three fixed-width bars plus gaps exceed
              the content width on a narrow phone and force a sideways scroll. */}
          <Skeleton className="h-4 min-w-0 flex-[2]" />
          <Skeleton className="hidden h-4 min-w-0 flex-[3] sm:block" />
          <Skeleton className="h-5 w-16 shrink-0 rounded-[var(--radius-badge)]" />
        </div>
      ))}
    </div>
  );
}
