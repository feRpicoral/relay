import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";

import { locales, localeUrlSlug, slugToLocale } from "@/i18n/config";

export function generateStaticParams() {
  return Object.values(localeUrlSlug).map((locale) => ({ locale }));
}

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale: urlSlug } = await params;
  const locale = slugToLocale(urlSlug);
  if (!locale || !hasLocale(locales, locale)) notFound();

  // Let next-intl statically render this segment.
  setRequestLocale(locale);

  const messages = await getMessages({ locale });

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
