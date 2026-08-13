import { NextResponse, type NextRequest } from "next/server";
import { GATE_COOKIE, verifyGateToken } from "@/lib/auth/gate";

/**
 * Next 16 renamed `middleware.ts` to `proxy.ts`.
 *
 * Everything except the unlock screen and its API sits behind the gate. This
 * runs before any route renders, so an unauthenticated request never reaches a
 * page or a database query.
 */

/** The unlock screen itself. Bouncing an already-unlocked visitor off it is fine. */
const UNLOCK_PAGE = "/unlock";

/**
 * Always reachable, in both states. The unlock endpoint must stay open even
 * when unlocked — it is also how you lock again (DELETE). Redirecting it would
 * silently break the lock button.
 */
const ALWAYS_OPEN = new Set(["/api/unlock"]);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const secret = process.env.GATE_SECRET;
  const unlocked =
    !!secret &&
    (await verifyGateToken(request.cookies.get(GATE_COOKIE)?.value, secret));

  if (ALWAYS_OPEN.has(pathname)) {
    return NextResponse.next();
  }

  if (pathname === UNLOCK_PAGE) {
    return unlocked
      ? NextResponse.redirect(new URL("/dashboard", request.url))
      : NextResponse.next();
  }

  if (unlocked) {
    return NextResponse.next();
  }

  // API routes get a status, not a redirect — a fetch should fail loudly
  // rather than receive an HTML login page it cannot parse.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Locked" }, { status: 401 });
  }

  const url = new URL("/unlock", request.url);
  if (pathname !== "/") {
    url.searchParams.set("next", pathname + request.nextUrl.search);
  }
  return NextResponse.redirect(url);
}

export const config = {
  // Exclude static assets — without this the gate would block CSS and JS
  // on the unlock page itself.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
