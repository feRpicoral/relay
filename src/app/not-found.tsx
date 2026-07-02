import { Compass } from "lucide-react";
import { cookies, headers } from "next/headers";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { StateCard } from "@/components/ui/state-card";
import { defaultLocale, isLocale, type Locale } from "@/i18n/config";
import { parseAcceptLanguage } from "@/i18n/parse-accept-language";

const STRINGS = {
  "en-US": {
    title: "Page not found",
    description: "This path doesn't exist or has moved. Nothing to do with you.",
    backHome: "Back to overview",
  },
  "pt-BR": {
    title: "Página não encontrada",
    description: "Esse caminho não existe ou foi movido. Não é nada com você.",
    backHome: "Voltar para a visão geral",
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
      <StateCard
        icon={<Compass />}
        iconTone="primary"
        title={t.title}
        description={t.description}
        actions={
          <Button asChild>
            <Link href="/overview">{t.backHome}</Link>
          </Button>
        }
      />
    </main>
  );
}
