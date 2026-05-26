import { optionalEnv, requireEnv } from "@/lib/env";

/**
 * Supabase's new API key style splits the legacy `anon`/`service_role` keys
 * into `publishable`/`secret`. Project convention is to use the new names;
 * existing deployments may still be on the legacy names, so we accept both
 * and prefer the new one when set.
 */
export function getSupabasePublishableKey(): string {
  return (
    optionalEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") ??
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  );
}

export function getSupabaseSecretKey(): string {
  return optionalEnv("SUPABASE_SECRET_KEY") ?? requireEnv("SUPABASE_SERVICE_ROLE_KEY");
}
