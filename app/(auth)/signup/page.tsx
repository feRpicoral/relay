import type { Metadata } from "next";
import Link from "next/link";

import { SignupForm } from "./form";

export const metadata: Metadata = { title: "Criar conta" };

export default function SignupPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Criar conta</h1>
        <p className="text-muted-foreground text-sm">
          Comece a atender ligações com IA em minutos.
        </p>
      </div>
      <SignupForm />
      <p className="text-muted-foreground text-center text-sm">
        Já tem conta?{" "}
        <Link href="/login" className="text-foreground underline-offset-4 hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
