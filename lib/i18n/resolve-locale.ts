import "server-only";

import { cookies, headers } from "next/headers";
import type { NextRequest } from "next/server";

import { defaultLocale, isLocale, type Locale } from "@/i18n/config";
import { parseAcceptLanguage } from "@/i18n/parse-accept-language";

export const LOCALE_COOKIE = "NEXT_LOCALE";

/**
 * Server-side locale resolution for next-intl. Reads, in priority order:
 *
 *   1. The Supabase user's persisted `User.locale` (DB) — authoritative
 *      when signed in.
 *   2. The `NEXT_LOCALE` cookie — last device-level choice.
 *   3. The `Accept-Language` request header — first-visit signal.
 *   4. `defaultLocale` (en-US).
 *
 * The DB lookup is imported lazily so this util can be called from layouts
 * that the marketing tree does not authenticate (and from `getRequestConfig`,
 * which next-intl evaluates very early in the request).
 */
export async function resolveLocale(): Promise<Locale> {
  const dbLocale = await readUserLocaleFromSession();
  if (dbLocale) return dbLocale;

  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  if (isLocale(cookieLocale)) return cookieLocale;

  const headerStore = await headers();
  const fromHeader = parseAcceptLanguage(headerStore.get("accept-language"));
  if (fromHeader) return fromHeader;

  return defaultLocale;
}

/**
 * proxy.ts variant. Cannot read DB (proxy runs on the edge of the request,
 * before any session check), so the order collapses to cookie → header →
 * default. The DB tier is applied later by the (app) layout, which passes
 * `User.locale` directly into `NextIntlClientProvider`.
 */
export function resolveLocaleFromRequest(req: NextRequest): Locale {
  const cookieLocale = req.cookies.get(LOCALE_COOKIE)?.value;
  if (isLocale(cookieLocale)) return cookieLocale;

  const fromHeader = parseAcceptLanguage(req.headers.get("accept-language"));
  if (fromHeader) return fromHeader;

  return defaultLocale;
}

async function readUserLocaleFromSession(): Promise<Locale | null> {
  // Lazy imports keep this resolver usable in the marketing tree (where we
  // never call Supabase) and in `getRequestConfig` (which next-intl
  // evaluates very early — pulling in the full DB / Supabase stack at
  // module-eval time would bloat cold starts).
  const { createServerSupabase } = await import("@/lib/supabase/server");
  const { getPrisma } = await import("@/lib/db/client");
  const { fromPrismaLocale } = await import("@/i18n/config");

  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const row = await getPrisma().user.findUnique({
      where: { id: user.id },
      select: { locale: true },
    });
    return row ? fromPrismaLocale(row.locale) : null;
  } catch {
    // DB / Supabase unavailable. Don't crash request-config evaluation —
    // fall through to the cookie / header tier.
    return null;
  }
}
