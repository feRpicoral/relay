import {
  ArrowRight,
  BarChart3,
  CalendarClock,
  MessageSquareText,
  Phone,
  Sparkles,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { slugToLocale } from "@/i18n/config";

interface LandingPageProps {
  params: Promise<{ locale: string }>;
}

export default async function LandingPage({ params }: LandingPageProps) {
  const { locale: urlSlug } = await params;
  const locale = slugToLocale(urlSlug);
  // Layout already redirected on invalid slugs; this is just for setRequestLocale.
  if (locale) setRequestLocale(locale);

  const t = await getTranslations("landing");
  const tFeatures = await getTranslations("landing.features");

  const features = [
    { icon: Phone, key: "alwaysOn" },
    { icon: CalendarClock, key: "scheduling" },
    { icon: MessageSquareText, key: "transcripts" },
    { icon: BarChart3, key: "analytics" },
  ] as const;

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="bg-primary/20 absolute top-0 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full blur-3xl" />
        <div className="to-background absolute inset-0 bg-gradient-to-b from-transparent" />
      </div>

      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <div className="bg-primary text-primary-foreground flex h-7 w-7 items-center justify-center rounded-md">
            <Zap className="h-4 w-4" />
          </div>
          Relay
        </Link>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">{t("nav.signIn")}</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/signup">{t("nav.getStarted")}</Link>
          </Button>
        </div>
      </nav>

      <section className="mx-auto max-w-6xl px-6 pt-16 pb-24 text-center">
        <Badge
          variant="outline"
          className="border-primary/30 bg-primary/5 text-primary mb-6 gap-1.5"
        >
          <Sparkles className="h-3 w-3" />
          {t("badge")}
        </Badge>
        <h1 className="text-5xl leading-[1.05] font-semibold tracking-tight text-balance md:text-7xl">
          {t("hero.titleStart")} <span className="text-primary">{t("hero.titleAccent")}</span>
          {t("hero.titleEnd")}
        </h1>
        <p className="text-muted-foreground mx-auto mt-6 max-w-2xl text-lg text-balance">
          {t("hero.description")}
        </p>
        <div className="mt-10 flex items-center justify-center gap-3">
          <Button asChild size="lg" className="gap-2">
            <Link href="/signup">
              {t("hero.ctaPrimary")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/login">{t("hero.ctaSecondary")}</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, key }) => (
            <div
              key={key}
              className="group border-border bg-card/50 hover:border-primary/30 hover:bg-card rounded-xl border p-6 transition-all"
            >
              <Icon className="text-primary h-5 w-5" />
              <h3 className="mt-4 font-semibold">{tFeatures(`${key}.title`)}</h3>
              <p className="text-muted-foreground mt-2 text-sm">{tFeatures(`${key}.body`)}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-border border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 md:flex-row">
          <p className="text-muted-foreground text-sm">
            {t("footer.copyright", { year: new Date().getFullYear() })}
          </p>
          <div className="text-muted-foreground flex items-center gap-4 text-sm">
            <Link href="/login" className="hover:text-foreground transition-colors">
              {t("footer.login")}
            </Link>
            <Link href="/signup" className="hover:text-foreground transition-colors">
              {t("footer.signup")}
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
