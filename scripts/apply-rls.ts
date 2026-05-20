#!/usr/bin/env tsx
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { loadEnvConfig } from "@next/env";
import { Client } from "pg";

import { requireEnv } from "../lib/env";

loadEnvConfig(process.cwd());

async function main() {
  const sqlPath = resolve(__dirname, "..", "prisma", "sql", "setup.sql");
  const sql = readFileSync(sqlPath, "utf8");
  const url = requireEnv("DIRECT_URL");
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await client.query(sql);
    console.log("RLS + auth sync applied.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
