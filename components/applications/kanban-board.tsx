"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { toast } from "sonner";
import {
  ApplicationCardBody,
  type ApplicationCardData,
} from "@/components/applications/application-card";
import { APPLICATION_STATUSES, STATUS_CONFIG } from "@/lib/applications/status";
import { cn } from "@/lib/utils";
import type { ApplicationStatus } from "@/lib/generated/prisma/enums";

function DraggableCard({ application }: { application: ApplicationCardData }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: application.id,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn("cursor-grab touch-none active:cursor-grabbing", isDragging && "opacity-40")}
    >
      {/* The link is inside the draggable so a click still navigates, but a
          drag does not trigger it — dnd-kit suppresses the click after a move. */}
      <Link href={`/applications/${application.id}`} className="block">
        <ApplicationCardBody application={application} />
      </Link>
    </div>
  );
}

function Column({
  status,
  applications,
  isActiveTarget,
}: {
  status: ApplicationStatus;
  applications: ApplicationCardData[];
  isActiveTarget: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const config = STATUS_CONFIG[status];

  return (
    <div className="flex w-[264px] shrink-0 flex-col">
      <div className="mb-2 flex items-center gap-2 px-0.5">
        <span aria-hidden className={cn("h-1 w-6 rounded-full", config.accent)} />
        <h2 className="text-label font-medium text-ink">{config.label}</h2>
        <span className="tabular text-label text-ink-muted">{applications.length}</span>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-32 flex-1 flex-col gap-2 rounded-[var(--radius-card)] p-2 transition-colors",
          isOver
            ? "bg-brand-50 ring-1 ring-brand-200"
            : isActiveTarget
              ? "bg-canvas ring-1 ring-dashed ring-line"
              : "bg-canvas",
        )}
      >
        {applications.map((application) => (
          <DraggableCard key={application.id} application={application} />
        ))}

        {applications.length === 0 ? (
          <p className="grid flex-1 place-items-center rounded-[var(--radius-control)] border border-dashed border-line px-2 py-6 text-center text-label text-ink-muted">
            {isActiveTarget ? "Drop here" : "Nothing here"}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function KanbanBoard({
  applications: initial,
}: {
  applications: ApplicationCardData[];
}) {
  const router = useRouter();
  const [applications, setApplications] = useState(initial);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  // A small distance threshold means a click still reads as a click, so cards
  // stay navigable while remaining draggable.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const byStatus = useMemo(() => {
    const grouped = new Map<ApplicationStatus, ApplicationCardData[]>();
    for (const status of APPLICATION_STATUSES) grouped.set(status, []);
    for (const application of applications) {
      grouped.get(application.status)?.push(application);
    }
    return grouped;
  }, [applications]);

  const dragging = applications.find((item) => item.id === draggingId) ?? null;

  function handleDragStart(event: DragStartEvent) {
    setDraggingId(String(event.active.id));
  }

  async function handleDragEnd(event: DragEndEvent) {
    setDraggingId(null);

    const applicationId = String(event.active.id);
    const target = event.over?.id as ApplicationStatus | undefined;
    if (!target) return;

    const current = applications.find((item) => item.id === applicationId);
    if (!current || current.status === target) return;

    const previousStatus = current.status;

    // Optimistic: the board reorders immediately, and rolls back if the write
    // fails. Waiting on the network makes drag-and-drop feel broken.
    setApplications((items) =>
      items.map((item) =>
        item.id === applicationId ? { ...item, status: target } : item,
      ),
    );

    try {
      const response = await fetch(`/api/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: target }),
      });
      if (!response.ok) throw new Error();

      router.refresh();
    } catch {
      setApplications((items) =>
        items.map((item) =>
          item.id === applicationId ? { ...item, status: previousStatus } : item,
        ),
      );
      toast.error("Could not move that application. Please try again.");
    }
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setDraggingId(null)}
    >
      <div className="-mx-4 overflow-x-auto px-4 pb-2 md:-mx-6 md:px-6">
        <div className="flex gap-3">
          {APPLICATION_STATUSES.map((status) => (
            <Column
              key={status}
              status={status}
              applications={byStatus.get(status) ?? []}
              isActiveTarget={draggingId !== null}
            />
          ))}
        </div>
      </div>

      <DragOverlay>
        {dragging ? (
          <div className="w-[248px] rotate-2">
            <ApplicationCardBody application={dragging} isDragging />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
