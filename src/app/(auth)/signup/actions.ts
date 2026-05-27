"use server";

import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { z } from "zod";

import { consumeToken, OTP_LIMIT } from "@/lib/auth/rate-limit";
import { requireEnv } from "@/lib/env";
import { createServerSupabase } from "@/lib/supabase/server";
import type { Result } from "@/lib/types/result";

const Schema = z.object({
  email: z.string().email(),
  name: z.string().trim().min(1).max(120),
});

const SIGNUP_REDIRECT_PATH = "/create-org";
const GENERIC_SUCCESS: Result = { ok: true };

export async function signupAction(formData: FormData): Promise<Result> {
  const t = await getTranslations("signup.errors");
  const parsed = Schema.safeParse({
    email: formData.get("email"),
    name: formData.get("name"),
  });
  if (!parsed.success) {
    return { ok: false, error: t("invalidData") };
  }

  const normalizedEmail = parsed.data.email.trim().toLowerCase();
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const emailOk = consumeToken(`otp:email:${normalizedEmail}`, OTP_LIMIT);
  const ipOk = consumeToken(`otp:ip:${ip}`, OTP_LIMIT);
  if (!emailOk || !ipOk) return GENERIC_SUCCESS;

  const supabase = await createServerSupabase();
  const appUrl = requireEnv("NEXT_PUBLIC_APP_URL");
  const emailRedirectTo = new URL("/auth/callback", appUrl);
  emailRedirectTo.searchParams.set("next", SIGNUP_REDIRECT_PATH);

  const { error } = await supabase.auth.signInWithOtp({
    email: normalizedEmail,
    options: {
      emailRedirectTo: emailRedirectTo.toString(),
      shouldCreateUser: true,
      data: { name: parsed.data.name },
    },
  });

  if (error) {
    return { ok: false, error: t("sendFailed") };
  }
  return GENERIC_SUCCESS;
}
