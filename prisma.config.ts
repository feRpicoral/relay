import { loadEnvConfig } from "@next/env";
import { defineConfig } from "prisma/config";

// Prisma 7 reads connection URLs from this file, not from schema.prisma.
// Next.js's env loader picks up `.env.local` so `prisma migrate` and
// `prisma db seed` see the same vars the app sees at runtime.
loadEnvConfig(process.cwd());

const migrationUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!migrationUrl) {
  throw new Error(
    "DIRECT_URL (or DATABASE_URL as fallback) is not set. Copy .env.example to .env.local and fill in your Supabase connection strings.",
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: { url: migrationUrl },
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
});
