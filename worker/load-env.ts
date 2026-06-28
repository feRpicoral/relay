import { loadEnvConfig } from "@next/env";

// The worker runs as a standalone tsx process, so unlike the Next.js app it
// doesn't get automatic `.env.local` loading. Mirror prisma.config.ts and use
// Next's loader so `worker:dev` sees the same vars locally. In production env
// comes from the host (Fly secrets); real values take precedence and missing
// .env files are ignored, so this is a no-op there.
loadEnvConfig(process.cwd());
