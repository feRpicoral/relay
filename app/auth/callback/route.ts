import { type NextRequest, NextResponse } from "next/server";

import { getPrisma } from "@/lib/db/client";
import { createServerSupabase } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? null;

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", request.url));
  }

  const supabase = await createServerSupabase();
  const { error, data } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error?.message ?? "auth_failed")}`, request.url),
    );
  }

  // Check whether the user already has any membership.
  const membership = await getPrisma().membership.findFirst({
    where: { userId: data.user.id },
    select: { orgId: true },
  });

  if (next) {
    return NextResponse.redirect(new URL(next, request.url));
  }
  if (membership) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return NextResponse.redirect(new URL("/create-org", request.url));
}
