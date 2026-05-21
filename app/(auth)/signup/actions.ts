"use server";

import { z } from "zod";

import { requireEnv } from "@/lib/env";
import { createServerSupabase } from "@/lib/supabase/server";

const Schema = z.object({
  email: z.string().email(),
  name: z.string().trim().min(1).max(120),
});

type Result = { ok: true } | { ok: false; error: string };

export async function signupAction(formData: FormData): Promise<Result> {
  const parsed = Schema.safeParse({
    email: formData.get("email"),
    name: formData.get("name"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Verifique os dados informados." };
  }

  const supabase = await createServerSupabase();
  const appUrl = requireEnv("NEXT_PUBLIC_APP_URL");
  const emailRedirectTo = new URL("/auth/callback", appUrl);
  // Hard-code the post-signup destination: signup always lands on org creation.
  emailRedirectTo.searchParams.set("next", "/create-org");

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email.trim().toLowerCase(),
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
  return { ok: true };
}
