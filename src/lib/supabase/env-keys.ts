import { requireEnv } from "@/lib/env";

/**
 * Supabase's new API key style: `publishable` (client) and `secret` (server).
 * These are the only accepted names — the legacy `anon`/`service_role` keys are
 * not read.
 */
export function getSupabasePublishableKey(): string {
  return requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
}

export function getSupabaseSecretKey(): string {
  return requireEnv("SUPABASE_SECRET_KEY");
}
