import { Suspense } from "react";
import { UnlockForm } from "@/components/auth/unlock-form";

export const metadata = {
  title: "Unlock · CareerOS",
};

export default function UnlockPage() {
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-12">
      <div className="w-full max-w-sm animate-rise-in">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid size-11 place-items-center rounded-[var(--radius-card)] bg-brand-600 text-lg font-bold text-white">
            C
          </div>
          <h1 className="text-page-title text-ink">CareerOS</h1>
          <p className="mt-1 text-body text-ink-secondary">
            Your job search command center.
          </p>
        </div>

        <Suspense fallback={null}>
          <UnlockForm />
        </Suspense>
      </div>
    </main>
  );
}
