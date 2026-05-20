import { type NextRequest, NextResponse } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_PREFIXES = [
  "/_next",
  "/favicon",
  "/api/inngest",
  "/api/webhooks",
  "/login",
  "/signup",
  "/forgot-password",
  "/auth",
  "/accept-invite",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/" || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    if (
      pathname.startsWith("/login") ||
      pathname.startsWith("/signup") ||
      pathname.startsWith("/forgot-password")
    ) {
      const { response, user } = await updateSession(request);
      if (user) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
      return response;
    }
    return NextResponse.next();
  }

  const { response, user } = await updateSession(request);
  if (!user) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
