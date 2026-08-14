"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LogOut, Menu, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { NAV_SECTIONS } from "@/components/layout/nav-config";
import { cn } from "@/lib/utils";

/**
 * Responsive behaviour, per docs/04_UI_UX_Design_Brief.md:
 *   < 768px  drawer over the content, opened by a hamburger
 *   ≥ 768px  icon-only rail (64px)
 *   ≥ 1024px full sidebar (240px)
 */
export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Escape closes the drawer — keyboard parity with the close button.
  useEffect(() => {
    if (!isDrawerOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsDrawerOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isDrawerOpen]);

  async function handleLock() {
    await fetch("/api/unlock", { method: "DELETE" });
    router.push("/unlock");
    router.refresh();
  }

  return (
    <>
      {/* Mobile trigger */}
      <button
        type="button"
        onClick={() => setIsDrawerOpen(true)}
        aria-label="Open navigation"
        aria-expanded={isDrawerOpen}
        className="fixed top-3 left-3 z-40 grid size-9 place-items-center rounded-[var(--radius-control)] border border-line bg-surface text-ink-secondary shadow-[var(--shadow-card)] md:hidden"
      >
        <Menu aria-hidden className="size-4" />
      </button>

      {/* Mobile scrim */}
      {isDrawerOpen ? (
        <div
          onClick={() => setIsDrawerOpen(false)}
          className="animate-fade-in fixed inset-0 z-40 bg-black/25 md:hidden"
          aria-hidden
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-line bg-surface transition-transform duration-150",
          "md:w-16 md:translate-x-0 lg:w-60",
          isDrawerOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        {/* Brand */}
        <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-line px-4 md:justify-center lg:justify-start">
          <div className="grid size-7 shrink-0 place-items-center rounded-[var(--radius-badge)] bg-brand-600 text-[13px] font-bold text-white">
            C
          </div>
          <span className="text-card-title text-ink md:hidden lg:inline">
            CareerOS
          </span>
          <button
            type="button"
            onClick={() => setIsDrawerOpen(false)}
            aria-label="Close navigation"
            className="ml-auto grid size-8 place-items-center rounded-[var(--radius-badge)] text-ink-muted hover:bg-surface-hover md:hidden"
          >
            <X aria-hidden className="size-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav
          aria-label="Main navigation"
          className="flex-1 overflow-y-auto px-3 py-4 md:px-2 lg:px-3"
        >
          {NAV_SECTIONS.map((section, index) => (
            <div key={section.label ?? `group-${index}`} className="mb-5 last:mb-0">
              {section.label ? (
                <p className="section-label mb-1.5 px-2.5 md:hidden lg:block">
                  {section.label}
                </p>
              ) : null}

              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive =
                    pathname === item.href || pathname.startsWith(`${item.href}/`);
                  const Icon = item.icon;

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setIsDrawerOpen(false)}
                        aria-current={isActive ? "page" : undefined}
                        title={item.label}
                        className={cn(
                          "relative flex items-center gap-2.5 rounded-[var(--radius-control)] px-2.5 py-2 text-body transition-colors md:justify-center lg:justify-start",
                          isActive
                            ? "bg-brand-50 font-medium text-brand-700"
                            : "text-ink-secondary hover:bg-surface-hover hover:text-ink",
                        )}
                      >
                        {/* 3px active marker from the design brief */}
                        {isActive ? (
                          <span
                            aria-hidden
                            className="absolute top-1.5 bottom-1.5 -left-3 w-[3px] rounded-r bg-brand-600 md:hidden lg:block"
                          />
                        ) : null}
                        <Icon aria-hidden className="size-4 shrink-0" />
                        <span className="md:hidden lg:inline">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="shrink-0 border-t border-line p-3">
          <button
            type="button"
            onClick={handleLock}
            title="Lock CareerOS"
            className="flex w-full items-center gap-2.5 rounded-[var(--radius-control)] px-2.5 py-2 text-body text-ink-secondary transition-colors hover:bg-surface-hover hover:text-ink md:justify-center lg:justify-start"
          >
            <LogOut aria-hidden className="size-4 shrink-0" />
            <span className="md:hidden lg:inline">Lock</span>
          </button>
        </div>
      </aside>
    </>
  );
}
