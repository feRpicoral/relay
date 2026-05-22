import { Compass } from "lucide-react";
import { cookies, headers } from "next/headers";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { defaultLocale, isLocale, type Locale } from "@/i18n/config";
import { parseAcceptLanguage } from "@/i18n/parse-accept-language";

const STRINGS = {
  "en-US": {
    title: "Page not found",
    description: "This path doesn't exist or has moved. Nothing to do with you.",
    backHome: "Back to dashboard",
  },
  "pt-BR": {
    title: "Página não encontrada",
    description: "Esse caminho não existe ou foi movido. Não é nada com você.",
    backHome: "Voltar pro painel",
  },
} as const;

async function resolveCookieOrHeader(): Promise<Locale> {
  // Server-side not-found can't access the next-intl provider context; pick
  // locale from the request directly (cookie → Accept-Language → default).
  // Mirrors `resolveLocale` minus the DB tier so we don't bloat the 404 path.
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value;
  if (isLocale(cookieLocale)) return cookieLocale;
  const headerStore = await headers();
  return parseAcceptLanguage(headerStore.get("accept-language")) ?? defaultLocale;
}

export default async function NotFound() {
  const locale = await resolveCookieOrHeader();
  const t = STRINGS[locale];

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-md space-y-4 text-center">
        <div className="bg-primary/10 text-primary mx-auto flex h-12 w-12 items-center justify-center rounded-full">
          <Compass className="h-5 w-5" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
        <p className="text-muted-foreground text-sm">{t.description}</p>
        <Button asChild>
          <Link href="/dashboard">{t.backHome}</Link>
        </Button>
      </div>
    </main>
  );
}
