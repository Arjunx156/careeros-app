// Prisma 7 config — loads .env.local for Next.js compatibility
import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Next.js uses .env.local — load it explicitly
config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Use the direct (non-pooler) URL for migrations — Prisma Migrate
    // cannot run DDL through pgBouncer in transaction mode.
    url: process.env["DIRECT_DATABASE_URL"] ?? process.env["DATABASE_URL"],
  },
});
