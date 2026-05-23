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

export function getPrisma(): PrismaClient {
  if (process.env.NODE_ENV === "production") {
    return createPrisma();
  }
  if (!global.__prisma) {
    global.__prisma = createPrisma();
  }
  return global.__prisma;
}
