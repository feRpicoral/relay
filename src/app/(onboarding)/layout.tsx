import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

import { AuthCenteredShell } from "@/components/auth/auth-centered-shell";
import { resolveLocale } from "@/lib/i18n/resolve-locale";

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const locale = await resolveLocale();
  const messages = await getMessages({ locale });

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <AuthCenteredShell>{children}</AuthCenteredShell>
    </NextIntlClientProvider>
  );
}
