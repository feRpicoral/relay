import { Zap } from "lucide-react";
import Link from "next/link";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";

import { resolveLocale } from "@/lib/i18n/resolve-locale";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const locale = await resolveLocale();
  const messages = await getMessages({ locale });
  const t = await getTranslations({ locale, namespace: "auth.layout" });

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <div className="relative grid min-h-screen md:grid-cols-2">
        <div className="bg-card hidden flex-col justify-between p-12 md:flex">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <div className="bg-primary text-primary-foreground flex h-7 w-7 items-center justify-center rounded-md">
              <Zap className="h-4 w-4" />
            </div>
            Relay
          </Link>
          <div className="space-y-4">
            <p className="text-2xl leading-snug font-medium text-balance">
              &ldquo;{t("testimonialQuote")}&rdquo;
            </p>
            <p className="text-muted-foreground text-sm">- {t("testimonialAttribution")}</p>
          </div>
        </div>
        <div className="flex flex-col">
          <header className="flex items-center justify-between p-6 md:hidden">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <div className="bg-primary text-primary-foreground flex h-7 w-7 items-center justify-center rounded-md">
                <Zap className="h-4 w-4" />
              </div>
              Relay
            </Link>
          </header>
          <div className="flex flex-1 items-center justify-center px-6 pb-12">
            <div className="w-full max-w-sm">{children}</div>
          </div>
        </div>
      </div>
    </NextIntlClientProvider>
  );
}
