import { Sidebar } from "@/components/layout/sidebar";

/**
 * Shell for every gated page. The gate itself is enforced in proxy.ts, which
 * runs before this layout — an unauthenticated request never gets here.
 */
export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-dvh">
      <Sidebar />
      <div className="md:pl-16 lg:pl-60">
        <main className="mx-auto max-w-[1400px] px-4 py-6 pt-14 md:px-6 md:py-8 md:pt-8">
          {children}
        </main>
      </div>
    </div>
  );
}
