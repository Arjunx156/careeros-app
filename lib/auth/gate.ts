/**
 * The gate — CareerOS has no accounts, just one password protecting one
 * person's deployment.
 *
 * A signed cookie, not a stored session: the cookie carries an expiry and an
 * HMAC over it, so nothing needs to be persisted server-side and it verifies
 * in the edge runtime where `proxy.ts` runs.
 *
 * Built entirely on Web Crypto (no `node:crypto`) because Next 16 warns that
 * proxy code must not depend on Node built-ins or shared module state.
 */

export const GATE_COOKIE = "careeros_gate";

/** How long a single unlock lasts. */
const SESSION_DAYS = 30;
export const SESSION_MAX_AGE = SESSION_DAYS * 24 * 60 * 60;

const encoder = new TextEncoder();

function base64UrlEncode(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (const byte of view) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return base64UrlEncode(signature);
}

/**
 * Compare two strings without leaking their contents through timing.
 *
 * Both sides are HMAC'd with a per-call random key first, so the comparison
 * runs over fixed-length digests. That avoids the length-based early exit a
 * naive `===` would give an attacker, and works without `timingSafeEqual`.
 */
export async function safeEqual(a: string, b: string): Promise<boolean> {
  const nonce = base64UrlEncode(crypto.getRandomValues(new Uint8Array(32)));
  const [da, db] = await Promise.all([hmac(nonce, a), hmac(nonce, b)]);

  let mismatch = da.length ^ db.length;
  for (let i = 0; i < da.length && i < db.length; i++) {
    mismatch |= da.charCodeAt(i) ^ db.charCodeAt(i);
  }
  return mismatch === 0;
}

/** Mint a signed cookie value: `<expiresAtMs>.<hmac>`. */
export async function createGateToken(secret: string): Promise<string> {
  const expiresAt = Date.now() + SESSION_MAX_AGE * 1000;
  const payload = String(expiresAt);
  return `${payload}.${await hmac(secret, payload)}`;
}

/** Verify a cookie value. Returns false for tampered, malformed, or expired tokens. */
export async function verifyGateToken(
  token: string | undefined,
  secret: string,
): Promise<boolean> {
  if (!token) return false;

  const separator = token.lastIndexOf(".");
  if (separator <= 0) return false;

  const payload = token.slice(0, separator);
  const signature = token.slice(separator + 1);

  const expiresAt = Number(payload);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;

  return safeEqual(signature, await hmac(secret, payload));
}

/**
 * Read gate config, failing loudly when it is missing.
 *
 * A misconfigured gate must never silently fall open — if these are unset the
 * app refuses to serve rather than exposing every route.
 */
export function readGateConfig(): { password: string; secret: string } {
  const password = process.env.APP_PASSWORD;
  const secret = process.env.GATE_SECRET;

  if (!password || !secret) {
    throw new Error(
      "APP_PASSWORD and GATE_SECRET must both be set. See .env.example.",
    );
  }
  return { password, secret };
}
