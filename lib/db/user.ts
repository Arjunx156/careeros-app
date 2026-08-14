import { prisma } from "@/lib/db/prisma";

/**
 * Single-user mode.
 *
 * CareerOS is a personal tool with no signup, but every table still carries a
 * userId foreign key so the data model stays multi-user-capable. Instead of
 * reading an identity off a JWT, we resolve to one owner row.
 */
export const OWNER_EMAIL = "owner@careeros.local";

/**
 * Cached on globalThis, holding the in-flight promise rather than the resolved
 * value.
 *
 * Two reasons this matters:
 *   - Single-flight: concurrent callers (a page render plus its API calls all
 *     firing at once) share one query instead of each opening a connection.
 *   - Hot reload: dev re-evaluates modules constantly, and a module-local
 *     variable would reset each time, re-querying on every edit.
 */
const globalForOwner = globalThis as unknown as {
  ownerIdPromise: Promise<string> | undefined;
};

async function resolveOwnerId(): Promise<string> {
  // Read first. An upsert writes on every call, which turned a page load into
  // a database write and exhausted the connection pool under concurrency.
  const existing = await prisma.user.findUnique({
    where: { email: OWNER_EMAIL },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await prisma.user.create({
    data: { email: OWNER_EMAIL, name: "You" },
    select: { id: true },
  });
  return created.id;
}

export function getOwnerId(): Promise<string> {
  globalForOwner.ownerIdPromise ??= resolveOwnerId().catch((error) => {
    // Never cache a rejection — a transient connection failure would otherwise
    // poison every later request for the lifetime of the process.
    globalForOwner.ownerIdPromise = undefined;
    throw error;
  });

  return globalForOwner.ownerIdPromise;
}
