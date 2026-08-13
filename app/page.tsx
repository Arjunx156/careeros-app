import { redirect } from "next/navigation";

/**
 * There is no marketing landing page — CareerOS has one user, who is already
 * past the point of being sold to. Unauthenticated requests are sent to
 * /unlock by proxy.ts before this ever runs.
 */
export default function RootPage() {
  redirect("/dashboard");
}
