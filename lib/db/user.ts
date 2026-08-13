import { prisma } from "@/lib/db/prisma";

/**
 * Single-user mode.
 *
 * CareerOS is a personal tool with no signup, but every table still carries a
 * userId foreign key so the data model stays multi-user-capable. Instead of
 * reading an identity off a JWT, we resolve to one owner row.
 *
 * Every query in the app scopes by the id this returns — the same discipline
 * a multi-user build needs, just with a constant subject.
 */
export const OWNER_EMAIL = "owner@careeros.local";

let cachedUserId: string | null = null;

export async function getOwnerId(): Promise<string> {
  if (cachedUserId) return cachedUserId;

  const user = await prisma.user.upsert({
    where: { email: OWNER_EMAIL },
    update: {},
    create: { email: OWNER_EMAIL, name: "You" },
    select: { id: true },
  });

  cachedUserId = user.id;
  return user.id;
}
