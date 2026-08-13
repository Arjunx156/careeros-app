"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
};

/**
 * Built on the native <dialog> element, which gives focus trapping, focus
 * restore, Escape handling, and inert background content for free — all things
 * a hand-rolled div modal gets wrong.
 *
 * On mobile it becomes a bottom sheet, per the design brief.
 */
export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  className,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="modal-title"
      onCancel={(event) => {
        // Escape fires `cancel`; let React own the open state.
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        // Clicks land on the dialog itself only when they hit the backdrop.
        if (event.target === dialogRef.current) onClose();
      }}
      className={cn(
        "m-0 w-full max-w-lg bg-transparent p-0 backdrop:bg-black/30",
        "fixed bottom-0 left-1/2 -translate-x-1/2",
        "sm:top-1/2 sm:bottom-auto sm:-translate-y-1/2",
        className,
      )}
    >
      {isOpen ? (
        <div className="animate-rise-in max-h-[85dvh] overflow-y-auto rounded-t-[var(--radius-modal)] border border-line bg-surface shadow-[var(--shadow-modal)] sm:rounded-[var(--radius-modal)]">
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div className="min-w-0">
              <h2 id="modal-title" className="text-section text-ink">
                {title}
              </h2>
              {description ? (
                <p className="mt-0.5 text-body text-ink-secondary">
                  {description}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="grid size-8 shrink-0 place-items-center rounded-[var(--radius-badge)] text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
            >
              <X aria-hidden className="size-4" />
            </button>
          </div>

          <div className="px-5 py-4">{children}</div>
        </div>
      ) : null}
    </dialog>
  );
}
