"use server";

import { headers } from "next/headers";
import { z } from "zod";

import { consumeToken, OTP_LIMIT } from "@/lib/auth/rate-limit";
import { requireEnv } from "@/lib/env";
import { createServerSupabase } from "@/lib/supabase/server";

const Schema = z.object({
  email: z.string().email(),
  name: z.string().trim().min(1).max(120),
});

type Result = { ok: true } | { ok: false; error: string };

const GENERIC_SUCCESS: Result = { ok: true };

export async function signupAction(formData: FormData): Promise<Result> {
  const parsed = Schema.safeParse({
    email: formData.get("email"),
    name: formData.get("name"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Verifique os dados informados." };
  }

  const normalizedEmail = parsed.data.email.trim().toLowerCase();
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const emailOk = consumeToken(`otp:email:${normalizedEmail}`, OTP_LIMIT);
  const ipOk = consumeToken(`otp:ip:${ip}`, OTP_LIMIT);
  if (!emailOk || !ipOk) return GENERIC_SUCCESS;

  const supabase = await createServerSupabase();
  const appUrl = requireEnv("NEXT_PUBLIC_APP_URL");
  const emailRedirectTo = new URL("/auth/callback", appUrl);
  // Hard-code the post-signup destination: signup always lands on org creation.
  emailRedirectTo.searchParams.set("next", "/create-org");

  const { error } = await supabase.auth.signInWithOtp({
    email: normalizedEmail,
    options: {
      emailRedirectTo: emailRedirectTo.toString(),
      shouldCreateUser: true,
      data: { name: parsed.data.name },
    },
  });

  if (error) {
    // Generic error: don't leak provider wording to the UI.
    return { ok: false, error: "Não foi possível enviar o link. Tente novamente em instantes." };
  }
  return GENERIC_SUCCESS;
}
