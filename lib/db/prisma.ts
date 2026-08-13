import { PrismaClient } from "@/lib/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

/**
 * Prisma 7 requires a driver adapter. The Neon serverless driver is used
 * because this app deploys to Vercel, where each request may run in a fresh
 * isolate — the HTTP/WebSocket driver avoids exhausting Postgres connections
 * the way a classic TCP pool would.
 */
function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.",
    );
  }

  return new PrismaClient({
    adapter: new PrismaNeon({ connectionString }),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Hot reload in dev would otherwise create a new pool on every file change.
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
