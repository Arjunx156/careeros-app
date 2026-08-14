/**
 * Seed.
 *
 * Creates only the single owner row that every other table's userId points at.
 * There is deliberately no sample data: this is one person's real job search,
 * and invented applications sitting alongside real ones make the analytics
 * lie — a fake 100% referral rate is worse than no rate at all.
 *
 * Run with `npm run db:seed`. Safe to run repeatedly.
 */
import { config } from "dotenv";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

config({ path: ".env.local" });

const connectionString =
  process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set — cannot seed.");
}

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString }),
});

const OWNER_EMAIL = "owner@careeros.local";

async function main() {
  const owner = await prisma.user.upsert({
    where: { email: OWNER_EMAIL },
    update: {},
    create: { email: OWNER_EMAIL, name: "You" },
    select: { id: true },
  });

  console.log(`Owner ready (${owner.id}). No sample data — the app starts empty.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
