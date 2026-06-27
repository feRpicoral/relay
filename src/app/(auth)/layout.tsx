import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";

import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { resolveLocale } from "@/lib/i18n/resolve-locale";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const locale = await resolveLocale();
  const messages = await getMessages({ locale });
  const t = await getTranslations({ locale, namespace: "auth.layout" });

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <AuthSplitLayout
        quote={t("testimonialQuote")}
        attributionName={t("testimonialName")}
        attributionOrg={t("testimonialOrg")}
        tagline={t("tagline")}
      >
        {children}
      </AuthSplitLayout>
    </NextIntlClientProvider>
  );
}
