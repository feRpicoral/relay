import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

import { requireSession } from "@/lib/auth/session";
import { exchangeAuthCodeAndStore } from "@/lib/calendar/calcom";
import { CALCOM_OAUTH_STATE_COOKIE } from "@/lib/calendar/oauth-state";
import { requireEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await requireSession();
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(CALCOM_OAUTH_STATE_COOKIE)?.value;
  cookieStore.delete(CALCOM_OAUTH_STATE_COOKIE);

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(
      new URL("/settings/calendar?error=oauth_state_mismatch", request.url),
    );
  }

  const redirectUri = `${requireEnv("NEXT_PUBLIC_APP_URL")}/api/oauth/calcom/callback`;

  try {
    await exchangeAuthCodeAndStore({ orgId: session.orgId, code, redirectUri });
  } catch (err) {
    const message = err instanceof Error ? err.message : "oauth_failed";
    return NextResponse.redirect(
      new URL(`/settings/calendar?error=${encodeURIComponent(message)}`, request.url),
    );
  }

  return NextResponse.redirect(new URL("/settings/calendar?connected=cal_com", request.url));
}
