import {
  ArrowRight,
  BarChart3,
  CalendarCheck,
  MessageSquareText,
  Phone,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { FeatureCard } from "@/components/auth/feature-card";
import { LiveCallDemo } from "@/components/auth/live-call-demo";
import { QuoteCard } from "@/components/auth/quote-card";
import { RelayWordmark } from "@/components/auth/relay-wordmark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { slugToLocale } from "@/i18n/config";

interface LandingPageProps {
  params: Promise<{ locale: string }>;
}

export default async function LandingPage({ params }: LandingPageProps) {
  const { locale: urlSlug } = await params;
  const locale = slugToLocale(urlSlug);
  if (locale) setRequestLocale(locale);

  const t = await getTranslations("landing");
  const tFeatures = await getTranslations("landing.features");
  const tDemo = await getTranslations("landing.liveCall");
  const tAuth = await getTranslations("auth.layout");

  const features = [
    { icon: Phone, key: "alwaysOn" },
    { icon: CalendarCheck, key: "scheduling" },
    { icon: MessageSquareText, key: "transcripts" },
    { icon: BarChart3, key: "analytics" },
  ] as const;

  const turns = [
    { speaker: "agent", text: tDemo("turns.greeting") },
    { speaker: "caller", text: tDemo("turns.request") },
    { speaker: "agent", text: tDemo("turns.offer") },
  ] as const;

  const metrics = [tDemo("metrics.e2e"), tDemo("metrics.tts"), tDemo("metrics.tool")];

  return (
    <main className="bg-background min-h-screen">
      <nav className="border-border flex items-center justify-between border-b px-6 py-[18px] md:px-8">
        <RelayWordmark />
        <div className="flex items-center gap-5">
          <Link
            href="#features"
            className="text-muted-foreground hover:text-foreground hidden text-[13.5px] sm:block"
          >
            {t("nav.features")}
          </Link>
          <Link href="/login" className="text-muted-foreground hover:text-foreground text-[13.5px]">
            {t("nav.signIn")}
          </Link>
          <Button asChild size="sm">
            <Link href="/signup">{t("nav.getStarted")}</Link>
          </Button>
        </div>
      </nav>

      <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-14 md:px-8 lg:grid-cols-2">
        <div>
          <Badge
            variant="outline"
            className="border-primary/30 bg-primary/5 text-primary mb-[18px] gap-1.5"
          >
            <Sparkles className="size-3" />
            {t("badge")}
          </Badge>
          <h1 className="text-[34px] leading-[1.05] font-bold tracking-tight text-balance md:text-[42px]">
            {t("hero.title")}
          </h1>
          <p className="text-muted-foreground mt-4 max-w-[460px] text-base leading-relaxed">
            {t("hero.description")}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild size="lg" className="gap-2">
              <Link href="/signup">
                {t("hero.ctaPrimary")}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/login">{t("hero.ctaSecondary")}</Link>
            </Button>
          </div>
          <p className="text-muted-foreground mt-[18px] text-[12.5px]">{t("hero.note")}</p>
        </div>

        <LiveCallDemo
          phone={tDemo("phone")}
          elapsed={tDemo("elapsed")}
          liveLabel={tDemo("live")}
          agentLabel={tDemo("agent")}
          callerLabel={tDemo("caller")}
          turns={[...turns]}
          metrics={metrics}
        />
      </section>

      <section id="features" className="mx-auto max-w-6xl px-6 pb-14 md:px-8">
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon, key }) => (
            <FeatureCard
              key={key}
              icon={icon}
              title={tFeatures(`${key}.title`)}
              body={tFeatures(`${key}.body`)}
            />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16 md:px-8">
        <QuoteCard
          quote={t("quote.text")}
          attributionName={tAuth("testimonialName")}
          attributionOrg={tAuth("testimonialOrg")}
        />
      </section>

      <footer className="border-border border-t">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-6 md:px-8">
          <RelayWordmark />
          <p className="text-muted-foreground text-[12.5px]">
            {t("footer.copyright", { year: new Date().getFullYear() })}
          </p>
        </div>
      </footer>
    </main>
  );
}
