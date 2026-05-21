"use server";

import { z } from "zod";

import { safeNextPath } from "@/lib/auth/safe-redirect";
import { requireEnv } from "@/lib/env";
import { createServerSupabase } from "@/lib/supabase/server";

const Schema = z.object({
  email: z.string().email(),
  next: z.string().optional(),
});

type Result = { ok: true } | { ok: false; error: string };

/**
 * Generic message returned for both the "ok" path and the "email not found"
 * path so login can't be used to enumerate which emails have accounts.
 */
const GENERIC_SUCCESS: Result = { ok: true };

export async function loginAction(formData: FormData): Promise<Result> {
  const parsed = Schema.safeParse({
    email: formData.get("email"),
    next: formData.get("next"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Email inválido." };
  }

  const supabase = await createServerSupabase();
  const appUrl = requireEnv("NEXT_PUBLIC_APP_URL");
  const emailRedirectTo = new URL("/auth/callback", appUrl);
  const next = safeNextPath(parsed.data.next);
  if (next) emailRedirectTo.searchParams.set("next", next);

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email.trim().toLowerCase(),
    options: { emailRedirectTo: emailRedirectTo.toString(), shouldCreateUser: false },
  });

  if (error) {
    // Don't distinguish "email not found" from "ok": revealing it would let an
    // attacker enumerate registered users. The link is simply never delivered.
    if (error.message.toLowerCase().includes("not found")) {
      return GENERIC_SUCCESS;
    }
    // Avoid leaking the raw provider error to the UI for unexpected cases.
    return { ok: false, error: "Não foi possível enviar o link. Tente novamente em instantes." };
  }

  return GENERIC_SUCCESS;
}
