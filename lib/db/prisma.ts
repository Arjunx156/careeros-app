import { PrismaClient } from "@prisma/client";

// Prisma 7 + Neon — use standard PrismaClient with DATABASE_URL at runtime.
// The pooler URL is fine here because the app uses query mode (not DDL).
// Migrations use DIRECT_DATABASE_URL via prisma.config.ts.
function createPrismaClient() {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
