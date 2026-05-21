import type { Metadata } from "next";
import Link from "next/link";

import { safeNextPath } from "@/lib/auth/safe-redirect";

import { LoginForm } from "./form";

export const metadata: Metadata = { title: "Entrar" };

/**
 * Map the small set of error codes the auth flow surfaces (via `?error=...`)
 * to user-facing copy. Avoids rendering arbitrary attacker-controlled text on
 * the login page.
 */
const ERROR_MESSAGES: Record<string, string> = {
  auth_failed: "Não foi possível autenticar. Tente novamente.",
  missing_code: "Sessão inválida. Tente fazer login novamente.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = safeNextPath(params.next) ?? undefined;
  const initialError = params.error ? ERROR_MESSAGES[params.error] : undefined;
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Entrar</h1>
        <p className="text-muted-foreground text-sm">Acesse seu painel de voice agents.</p>
      </div>
      <LoginForm next={next} initialError={initialError} />
      <p className="text-muted-foreground text-center text-sm">
        Não tem conta?{" "}
        <Link href="/signup" className="text-foreground underline-offset-4 hover:underline">
          Criar conta
        </Link>
      </p>
    </div>
  );
}
