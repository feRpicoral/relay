import { Compass } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-md space-y-4 text-center">
        <div className="bg-primary/10 text-primary mx-auto flex h-12 w-12 items-center justify-center rounded-full">
          <Compass className="h-5 w-5" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Página não encontrada</h1>
        <p className="text-muted-foreground text-sm">
          Esse caminho não existe ou foi movido. Não é nada com você.
        </p>
        <Button asChild>
          <Link href="/dashboard">Voltar pro painel</Link>
        </Button>
      </div>
    </main>
  );
}
