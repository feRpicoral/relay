import { type NextRequest, NextResponse } from "next/server";

import { localeUrlSlug } from "@/i18n/config";
import { LOCALE_COOKIE, resolveLocaleFromRequest } from "@/lib/i18n/resolve-locale";
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
  // Marketing tree, locale-prefixed. Listed explicitly so the auth check
  // below short-circuits and we don't redirect signed-out visitors to /login.
  "/en",
  "/pt-br",
];

const LOCALE_URL_SLUGS = Object.values(localeUrlSlug);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // `/` doesn't render anything in the new App Router structure — landing
  // lives under `[locale]`. Send first-time visitors to their best-match
  // locale slug and seed the cookie at the same time.
  if (pathname === "/") {
    const locale = resolveLocaleFromRequest(request);
    const slug = localeUrlSlug[locale];
    const target = new URL(`/${slug}`, request.url);
    const redirect = NextResponse.redirect(target);
    setLocaleCookieIfMissing(request, redirect, locale);
    return redirect;
  }

  if (pathname === "/" || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    if (
      pathname.startsWith("/login") ||
      pathname.startsWith("/signup") ||
      pathname.startsWith("/forgot-password")
    ) {
      const { response, user } = await updateSession(request);
      if (user) {
        return NextResponse.redirect(new URL("/overview", request.url));
      }
      setLocaleCookieIfMissing(request, response, resolveLocaleFromRequest(request));
      return response;
    }

    // Marketing tree — also a good spot to seed the locale cookie on
    // direct visits to `/en` or `/pt-br` that didn't bounce through `/`.
    if (
      LOCALE_URL_SLUGS.some((slug) => pathname === `/${slug}` || pathname.startsWith(`/${slug}/`))
    ) {
      const response = NextResponse.next();
      setLocaleCookieIfMissing(request, response, resolveLocaleFromRequest(request));
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
  setLocaleCookieIfMissing(request, response, resolveLocaleFromRequest(request));
  return response;
}

function setLocaleCookieIfMissing(
  request: NextRequest,
  response: NextResponse,
  locale: string,
): void {
  if (request.cookies.get(LOCALE_COOKIE)?.value) return;
  response.cookies.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
