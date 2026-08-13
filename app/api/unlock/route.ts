import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  GATE_COOKIE,
  SESSION_MAX_AGE,
  createGateToken,
  readGateConfig,
  safeEqual,
} from "@/lib/auth/gate";

const bodySchema = z.object({
  password: z.string().min(1).max(200),
});

/**
 * Throttle guessing.
 *
 * In-memory, so it resets when the serverless instance recycles. That is a real
 * limitation, but combined with a long random password it is proportionate for
 * a single-user deployment — and it costs nothing to run.
 */
const ATTEMPT_LIMIT = 8;
const ATTEMPT_WINDOW_MS = 10 * 60 * 1000;
const attempts = new Map<string, { count: number; resetAt: number }>();

function rateLimit(key: string): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const record = attempts.get(key);

  if (!record || now > record.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + ATTEMPT_WINDOW_MS });
    return { allowed: true, retryAfter: 0 };
  }

  record.count += 1;
  if (record.count > ATTEMPT_LIMIT) {
    return {
      allowed: false,
      retryAfter: Math.ceil((record.resetAt - now) / 1000),
    };
  }
  return { allowed: true, retryAfter: 0 };
}

export async function POST(request: NextRequest) {
  let config: ReturnType<typeof readGateConfig>;
  try {
    config = readGateConfig();
  } catch {
    return NextResponse.json(
      { error: "The gate is not configured. Set APP_PASSWORD and GATE_SECRET." },
      { status: 500 },
    );
  }

  const clientKey =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";

  const limit = rateLimit(clientKey);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${limit.retryAfter}s.` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a password." }, { status: 400 });
  }

  if (!(await safeEqual(parsed.data.password, config.password))) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  attempts.delete(clientKey);

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: GATE_COOKIE,
    value: await createGateToken(config.secret),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: GATE_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
