import { Zap } from "lucide-react";
import Link from "next/link";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";

import { resolveLocale } from "@/lib/i18n/resolve-locale";

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const locale = await resolveLocale();
  const messages = await getMessages({ locale });
  const t = await getTranslations({ locale, namespace: "onboarding.layout" });

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <div className="min-h-screen">
        <header className="border-border border-b">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <div className="bg-primary text-primary-foreground flex h-7 w-7 items-center justify-center rounded-md">
                <Zap className="h-4 w-4" />
              </div>
              Relay
            </Link>
            <form action="/auth/signout" method="post">
              <button type="submit" className="text-muted-foreground hover:text-foreground text-sm">
                {t("signOut")}
              </button>
            </form>
          </div>
        </header>
        <main className="mx-auto max-w-2xl px-6 py-12">{children}</main>
      </div>
    </NextIntlClientProvider>
  );
}
