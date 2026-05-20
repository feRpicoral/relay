"use server";

import { z } from "zod";

import { requireEnv } from "@/lib/env";
import { createServerSupabase } from "@/lib/supabase/server";

const Schema = z.object({
  email: z.string().email(),
  next: z.string().optional(),
});

type Result = { ok: true } | { ok: false; error: string };

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
  if (parsed.data.next) emailRedirectTo.searchParams.set("next", parsed.data.next);

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { emailRedirectTo: emailRedirectTo.toString(), shouldCreateUser: false },
  });

  if (error) {
    if (error.message.toLowerCase().includes("not found")) {
      return { ok: false, error: "Não encontramos esse email. Crie uma conta primeiro." };
    }
    return { ok: false, error: error.message };
  }

  return { ok: true };
}
