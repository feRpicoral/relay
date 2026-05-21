import { type NextRequest, NextResponse } from "next/server";

import { safeNextPath } from "@/lib/auth/safe-redirect";
import { getPrisma } from "@/lib/db/client";
import { createServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNextPath(url.searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", request.url));
  }

  const supabase = await createServerSupabase();
  const { error, data } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    // Don't echo Supabase's raw error message into the URL: it can be used
    // to render attacker-controlled text on the login page (phishing aid).
    return NextResponse.redirect(new URL("/login?error=auth_failed", request.url));
  }

  // Check whether the user already has any membership.
  let membership: { orgId: string } | null = null;
  try {
    membership = await getPrisma().membership.findFirst({
      where: { userId: data.user.id },
      select: { orgId: true },
    });
  } catch {
    // DB is down; redirect to login so the user retries instead of seeing a 500.
    return NextResponse.redirect(new URL("/login?error=auth_failed", request.url));
  }

  if (next) {
    return NextResponse.redirect(new URL(next, request.url));
  }
  if (membership) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return NextResponse.redirect(new URL("/create-org", request.url));
}
