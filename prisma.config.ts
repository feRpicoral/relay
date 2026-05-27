import { loadEnvConfig } from "@next/env";
import { defineConfig } from "prisma/config";

// Prisma 7 reads connection URLs from this file, not from schema.prisma.
// Next.js's env loader picks up `.env.local` so `prisma migrate` and
// `prisma db seed` see the same vars the app sees at runtime.
loadEnvConfig(process.cwd());

// Placeholder used only when the env is empty (e.g. CI jobs that run
// `yarn install` → `prisma generate` without ever connecting). Throwing here
// would crash unrelated jobs like commitlint that just need the install to
// succeed. Real DB-touching commands (`prisma migrate`, `db seed`) fail later
// with a clear "couldn't connect" error if the env was actually missing.
const PLACEHOLDER_URL = "postgresql://placeholder:placeholder@127.0.0.1:5432/placeholder";
const migrationUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? PLACEHOLDER_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: { url: migrationUrl },
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
});
