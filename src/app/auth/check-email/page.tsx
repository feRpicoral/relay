import { Mail } from "lucide-react";
import Link from "next/link";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";

import { AuthCenteredShell } from "@/components/auth/auth-centered-shell";
import { Button } from "@/components/ui/button";
import { StateCard } from "@/components/ui/state-card";
import { resolveLocale } from "@/lib/i18n/resolve-locale";

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  const locale = await resolveLocale();
  const messages = await getMessages({ locale });
  const t = await getTranslations({ locale, namespace: "checkEmail" });

  const description = email
    ? t.rich("descriptionWithEmail", {
        email,
        strong: (chunks) => <strong className="text-foreground font-semibold">{chunks}</strong>,
      })
    : t("descriptionGeneric");

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <AuthCenteredShell>
        <StateCard
          icon={<Mail />}
          iconTone="primary"
          title={t("title")}
          description={description}
          actions={
            <div className="flex flex-col items-center gap-4">
              <p className="text-muted-foreground text-[12.5px]">{t("expiryNote")}</p>
              <Button asChild variant="outline">
                <Link href="/login">{t("backToLogin")}</Link>
              </Button>
            </div>
          }
        />
      </AuthCenteredShell>
    </NextIntlClientProvider>
  );
}
