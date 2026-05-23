import { type NextRequest, NextResponse } from "next/server";

import { createServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Logout endpoint. Server Actions get origin verification for free; this is a
 * plain route handler so we have to do it ourselves to prevent logout-CSRF.
 */
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) {
    return new Response("missing origin", { status: 403 });
  }
  try {
    const originHost = new URL(origin).host;
    if (originHost !== host) {
      return new Response("cross-origin", { status: 403 });
    }
  } catch {
    return new Response("invalid origin", { status: 403 });
  }

  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
