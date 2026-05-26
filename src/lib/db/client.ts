import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import { requireEnv } from "@/lib/env";

declare global {
  var __prisma: PrismaClient | undefined;
}

function createPrisma(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: requireEnv("DATABASE_URL") });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

/**
 * Returns a process-wide PrismaClient. We cache in production too because the
 * worker hits the DB many times per call, and minting a fresh client on every
 * call exhausts the Supabase pooler's connection budget. The `global.__prisma`
 * pattern also doubles as HMR resilience in dev.
 */
export function getPrisma(): PrismaClient {
  if (!global.__prisma) {
    global.__prisma = createPrisma();
  }
  return global.__prisma;
}
