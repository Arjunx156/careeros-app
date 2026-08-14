"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { LayoutGrid, Search, Table2 } from "lucide-react";
import { KanbanBoard } from "@/components/applications/kanban-board";
import type { ApplicationCardData } from "@/components/applications/application-card";
import { STATUS_CONFIG } from "@/lib/applications/status";
import { BAND_TEXT, scoreBand } from "@/lib/score";
import { cn } from "@/lib/utils";

type ViewMode = "kanban" | "table";

function StatusBadge({ status }: { status: ApplicationCardData["status"] }) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-[var(--radius-badge)] border px-2 py-0.5 text-label font-medium",
        config.badge,
      )}
    >
      {config.label}
    </span>
  );
}

function TableView({ applications }: { applications: ApplicationCardData[] }) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[760px] text-left">
        <thead>
          <tr className="border-b border-line">
            {["Company", "Role", "Status", "Applied", "Match", "Resume"].map((head) => (
              <th
                key={head}
                scope="col"
                className="px-4 py-2.5 text-label font-medium text-ink-secondary"
              >
                {head}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {applications.map((application) => (
            <tr
              key={application.id}
              className="border-b border-line-subtle transition-colors last:border-0 hover:bg-surface-hover"
            >
              <td className="px-4 py-2.5">
                <Link
                  href={`/applications/${application.id}`}
                  className="text-body font-medium text-ink hover:text-brand-600"
                >
                  {application.company}
                </Link>
              </td>
              <td className="px-4 py-2.5 text-body text-ink-secondary">
                {application.role}
              </td>
              <td className="px-4 py-2.5">
                <StatusBadge status={application.status} />
              </td>
              <td className="px-4 py-2.5 text-body text-ink-secondary">
                {application.applicationDate
                  ? format(new Date(application.applicationDate), "d MMM yyyy")
                  : "—"}
              </td>
              <td className="px-4 py-2.5">
                {application.matchScore !== null ? (
                  <span
                    className={cn(
                      "tabular text-body font-semibold",
                      BAND_TEXT[scoreBand(application.matchScore)],
                    )}
                  >
                    {application.matchScore}
                  </span>
                ) : (
                  <span className="text-ink-muted">—</span>
                )}
              </td>
              <td className="px-4 py-2.5 text-body text-ink-secondary">
                {application.resumeVersion?.name ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ApplicationsView({
  applications,
}: {
  applications: ApplicationCardData[];
}) {
  const [mode, setMode] = useState<ViewMode>("kanban");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (term.length === 0) return applications;

    return applications.filter(
      (application) =>
        application.company.toLowerCase().includes(term) ||
        application.role.toLowerCase().includes(term),
    );
  }, [applications, query]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search company or role"
            aria-label="Search applications"
            className="h-9 w-full rounded-[var(--radius-control)] border border-line bg-surface pr-3 pl-9 text-body text-ink transition-colors placeholder:text-ink-muted focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none"
          />
        </div>

        <div
          role="group"
          aria-label="View mode"
          className="flex shrink-0 rounded-[var(--radius-control)] border border-line bg-surface p-0.5"
        >
          {(
            [
              { value: "kanban", label: "Board", icon: LayoutGrid },
              { value: "table", label: "Table", icon: Table2 },
            ] as const
          ).map((option) => {
            const Icon = option.icon;
            const isActive = mode === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setMode(option.value)}
                aria-pressed={isActive}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-badge)] px-2.5 text-label font-medium transition-colors",
                  isActive
                    ? "bg-brand-50 text-brand-700"
                    : "text-ink-secondary hover:bg-surface-hover hover:text-ink",
                )}
              >
                <Icon aria-hidden className="size-3.5" />
                {option.label}
              </button>
            );
          })}
        </div>

        <p className="tabular shrink-0 text-label text-ink-muted">
          {filtered.length} of {applications.length}
        </p>
      </div>

      {mode === "kanban" ? (
        <KanbanBoard applications={filtered} />
      ) : (
        <TableView applications={filtered} />
      )}
    </div>
  );
}
