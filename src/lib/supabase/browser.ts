"use client";

import { createBrowserClient } from "@supabase/ssr";

let cached: ReturnType<typeof createBrowserClient> | null = null;

export function getBrowserSupabase() {
  if (cached) return cached;
  const client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  );

  // Wire the user's JWT into the Realtime client on session restore. The
  // SupabaseClient's internal `_handleTokenChanged` only forwards `SIGNED_IN`
  // and `TOKEN_REFRESHED` to `realtime.setAuth` — `INITIAL_SESSION` (the event
  // emitted when a cookie-backed session restores on page load) is ignored.
  // Without this, every channel subscribed before a fresh sign-in negotiates
  // the WebSocket using just the anon key, RLS rejects every postgres_changes
  // payload, and the live monitor goes dark for transcripts, metrics, call
  // status, and the post-call redirect. Regressed when supabase-js bumped
  // from 2.47 → 2.106.
  client.auth.onAuthStateChange((event, session) => {
    if (event === "INITIAL_SESSION" && session?.access_token) {
      void client.realtime.setAuth(session.access_token);
    }
  });

  cached = client;
  return cached;
}
