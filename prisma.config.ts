import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Next.js keeps secrets in .env.local; the Prisma CLI does not read it by default.
config({ path: ".env.local" });

/**
 * Neon hands out URLs with `channel_binding=require`. The Neon serverless driver
 * (used by the app at runtime) supports it, but Prisma Migrate's engine does not
 * and fails with a misleading `P1001: Can't reach database server`. Strip the
 * parameter for CLI connections only — TLS is still enforced by sslmode=require.
 */
function migrationUrl(): string | undefined {
  const raw = process.env["DIRECT_DATABASE_URL"] ?? process.env["DATABASE_URL"];
  if (!raw) return undefined;

  try {
    const url = new URL(raw);
    url.searchParams.delete("channel_binding");
    return url.toString();
  } catch {
    return raw;
  }
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Direct (non-pooler) URL: Prisma Migrate cannot run DDL through pgBouncer
    // in transaction mode.
    url: migrationUrl(),
  },
});
