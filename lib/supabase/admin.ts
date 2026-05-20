import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { requireEnv } from "@/lib/env";

let cached: SupabaseClient | null = null;

/**
 * Service-role client. Bypasses RLS. Use sparingly — only for trusted server paths
 * (webhook handlers, admin actions, tenant resolution at call-start). Never expose
 * to the client.
 */
export function getServiceSupabase(): SupabaseClient {
  if (!cached) {
    cached = createClient(
      requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
      requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
      {
        auth: { autoRefreshToken: false, persistSession: false },
      },
    );
  }
  return cached;
}
