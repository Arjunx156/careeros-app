"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import { Check, Clock, CalendarPlus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type FollowUpRow = {
  id: string;
  type: "application" | "contact";
  dueDate: string | Date;
  note: string | null;
  application: { id: string; company: string; role: string } | null;
  contact: { id: string; name: string; company: string | null } | null;
};

type Group = "overdue" | "thisWeek" | "upcoming";

const GROUP_STYLE: Record<Group, { label: string; dot: string; text: string }> = {
  overdue: { label: "Overdue", dot: "bg-danger", text: "text-danger" },
  thisWeek: { label: "Due this week", dot: "bg-warning", text: "text-warning" },
  upcoming: { label: "Upcoming", dot: "bg-success", text: "text-success" },
};

function FollowUpItem({
  item,
  group,
  compact,
}: {
  item: FollowUpRow;
  group: Group;
  compact: boolean;
}) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);

  const due = item.dueDate instanceof Date ? item.dueDate : new Date(item.dueDate);

  const subject = item.application
    ? { label: item.application.company, sub: item.application.role, href: `/applications/${item.application.id}` }
    : item.contact
      ? { label: item.contact.name, sub: item.contact.company ?? "Contact", href: `/contacts/${item.contact.id}` }
      : { label: "Follow-up", sub: "", href: "/follow-ups" };

  async function act(action: "done" | "snooze" | "reschedule", dueDate?: string) {
    setIsPending(true);
    try {
      const response = await fetch(`/api/follow-ups/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, dueDate }),
      });
      if (!response.ok) throw new Error();

      toast.success(
        action === "done"
          ? "Marked done."
          : action === "snooze"
            ? "Snoozed for 3 days."
            : "Rescheduled.",
      );
      setIsRescheduling(false);
      router.refresh();
    } catch {
      toast.error("Could not update that follow-up.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <li
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-[var(--radius-control)] border border-line px-3 py-2.5",
        isPending && "opacity-60",
      )}
    >
      <span
        aria-hidden
        className={cn("size-1.5 shrink-0 rounded-full", GROUP_STYLE[group].dot)}
      />

      <div className="min-w-0 flex-1">
        <Link
          href={subject.href}
          className="truncate text-body font-medium text-ink hover:text-brand-600"
        >
          {subject.label}
        </Link>
        <p className="truncate text-label text-ink-muted">
          {subject.sub}
          {item.note ? ` · ${item.note}` : ""}
        </p>
      </div>

      <span
        className={cn(
          "shrink-0 text-label",
          group === "overdue" ? "font-medium text-danger" : "text-ink-muted",
        )}
      >
        {group === "overdue"
          ? `${formatDistanceToNow(due)} overdue`
          : format(due, "d MMM")}
      </span>

      {isRescheduling ? (
        <input
          type="date"
          autoFocus
          disabled={isPending}
          onChange={(event) => event.target.value && act("reschedule", event.target.value)}
          onBlur={() => setIsRescheduling(false)}
          className="h-8 shrink-0 rounded-[var(--radius-badge)] border border-line px-2 text-label"
        />
      ) : (
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={() => act("done")}
            disabled={isPending}
            title="Mark done"
            aria-label={`Mark follow-up for ${subject.label} done`}
            className="grid size-8 place-items-center rounded-[var(--radius-badge)] text-ink-muted transition-colors hover:bg-success-bg hover:text-success"
          >
            <Check aria-hidden className="size-4" />
          </button>

          {!compact ? (
            <>
              <button
                type="button"
                onClick={() => act("snooze")}
                disabled={isPending}
                title="Snooze 3 days"
                aria-label={`Snooze follow-up for ${subject.label}`}
                className="grid size-8 place-items-center rounded-[var(--radius-badge)] text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
              >
                <Clock aria-hidden className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsRescheduling(true)}
                disabled={isPending}
                title="Reschedule"
                aria-label={`Reschedule follow-up for ${subject.label}`}
                className="grid size-8 place-items-center rounded-[var(--radius-badge)] text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
              >
                <CalendarPlus aria-hidden className="size-4" />
              </button>
            </>
          ) : null}
        </div>
      )}
    </li>
  );
}

export function FollowUpGroup({
  group,
  items,
  compact = false,
}: {
  group: Group;
  items: FollowUpRow[];
  compact?: boolean;
}) {
  if (items.length === 0) return null;

  return (
    <div>
      <h3 className={cn("section-label mb-2", GROUP_STYLE[group].text)}>
        {GROUP_STYLE[group].label}
        <span className="tabular ml-1.5 text-ink-muted">{items.length}</span>
      </h3>
      <ul className="space-y-2">
        {items.map((item) => (
          <FollowUpItem key={item.id} item={item} group={group} compact={compact} />
        ))}
      </ul>
    </div>
  );
}
