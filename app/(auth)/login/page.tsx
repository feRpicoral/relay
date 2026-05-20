import type { Metadata } from "next";
import Link from "next/link";

import { LoginForm } from "./form";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Entrar</h1>
        <p className="text-muted-foreground text-sm">Acesse seu painel de voice agents.</p>
      </div>
      <LoginForm next={params.next} initialError={params.error} />
      <p className="text-muted-foreground text-center text-sm">
        Não tem conta?{" "}
        <Link href="/signup" className="text-foreground underline-offset-4 hover:underline">
          Criar conta
        </Link>
      </p>
    </div>
  );
}
