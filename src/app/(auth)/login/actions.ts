"use server";

import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { z } from "zod";

import { consumeToken, OTP_LIMIT } from "@/lib/auth/rate-limit";
import { safeNextPath } from "@/lib/auth/safe-redirect";
import { requireEnv } from "@/lib/env";
import { createServerSupabase } from "@/lib/supabase/server";
import type { Result } from "@/lib/types/result";

const Schema = z.object({
  email: z.string().email(),
  next: z.string().optional(),
});

/**
 * Generic message returned for both the "ok" path and the "email not found"
 * path so login can't be used to enumerate which emails have accounts.
 */
const GENERIC_SUCCESS: Result = { ok: true };

export async function loginAction(formData: FormData): Promise<Result> {
  const t = await getTranslations("login.errors");
  const parsed = Schema.safeParse({
    email: formData.get("email"),
    next: formData.get("next"),
  });
  if (!parsed.success) {
    return { ok: false, error: t("invalidEmail") };
  }

  // Rate-limit per email and per IP. Both reveal the same generic message so
  // an attacker can't tell whether they hit the cap or whether the email exists.
  const normalizedEmail = parsed.data.email.trim().toLowerCase();
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const emailOk = consumeToken(`otp:email:${normalizedEmail}`, OTP_LIMIT);
  const ipOk = consumeToken(`otp:ip:${ip}`, OTP_LIMIT);
  if (!emailOk || !ipOk) return GENERIC_SUCCESS;

  const supabase = await createServerSupabase();
  const appUrl = requireEnv("NEXT_PUBLIC_APP_URL");
  const emailRedirectTo = new URL("/auth/callback", appUrl);
  const next = safeNextPath(parsed.data.next);
  if (next) emailRedirectTo.searchParams.set("next", next);

  const { error } = await supabase.auth.signInWithOtp({
    email: normalizedEmail,
    options: { emailRedirectTo: emailRedirectTo.toString(), shouldCreateUser: false },
  });

  if (error) {
    // Don't distinguish "email not found" from "ok": revealing it would let an
    // attacker enumerate registered users. The link is simply never delivered.
    if (error.message.toLowerCase().includes("not found")) {
      return GENERIC_SUCCESS;
    }
    return { ok: false, error: t("sendFailed") };
  }

  return GENERIC_SUCCESS;
}
