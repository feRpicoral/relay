import { type NextRequest, NextResponse } from "next/server";

import { fromPrismaLocale } from "@/i18n/config";
import { safeNextPath } from "@/lib/auth/safe-redirect";
import { getPrisma } from "@/lib/db/client";
import { LOCALE_COOKIE } from "@/lib/i18n/resolve-locale";
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
  let userLocale: string | null = null;
  try {
    const [membershipRow, userRow] = await Promise.all([
      getPrisma().membership.findFirst({
        where: { userId: data.user.id },
        select: { orgId: true },
      }),
      getPrisma().user.findUnique({
        where: { id: data.user.id },
        select: { locale: true },
      }),
    ]);
    membership = membershipRow;
    if (userRow) userLocale = fromPrismaLocale(userRow.locale);
  } catch {
    // DB is down; redirect to login so the user retries instead of seeing a 500.
    return NextResponse.redirect(new URL("/login?error=auth_failed", request.url));
  }

  const target = next
    ? new URL(next, request.url)
    : membership
      ? new URL("/dashboard", request.url)
      : new URL("/create-org", request.url);

  const response = NextResponse.redirect(target);
  // Reseed the locale cookie so next-intl picks up the DB-stored preference
  // immediately on the redirected request, even if the previous device left
  // an outdated cookie behind.
  if (userLocale) {
    response.cookies.set(LOCALE_COOKIE, userLocale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }
  return response;
}
