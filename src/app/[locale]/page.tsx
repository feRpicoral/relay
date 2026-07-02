import "./marketing.css";

import { Activity, CalendarCheck, Check, Gauge, Lock, Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";

import { MarketingEnhancer } from "@/components/marketing/marketing-enhancer";
import { ThemeToggle } from "@/components/marketing/theme-toggle";
import { BarsGlyph, MarketingWordmark } from "@/components/marketing/wordmark";
import { defaultLocale, type Locale, localeUrlSlug, slugToLocale } from "@/i18n/config";

interface LandingPageProps {
  params: Promise<{ locale: string }>;
}

const SCREENS = "/marketing-screens";

const LOGOS = [
  "◐ Clínica Lumen",
  "✚ Odonto Vida",
  "❋ Núcleo Saúde",
  "◈ Clínica Aurora",
  "✦ Vita Diagnósticos",
  "◐ Bem Estar Med",
] as const;

export async function generateMetadata({ params }: LandingPageProps): Promise<Metadata> {
  const { locale: urlSlug } = await params;
  const locale = slugToLocale(urlSlug) ?? defaultLocale;
  const t = await getTranslations({ locale, namespace: "landing.meta" });
  return { title: { absolute: t("title") }, description: t("description") };
}

export default async function LandingPage({ params }: LandingPageProps) {
  const { locale: urlSlug } = await params;
  const locale = slugToLocale(urlSlug);
  if (locale) setRequestLocale(locale);

  const t = await getTranslations("landing");
  const bold = { b: (chunks: ReactNode) => <b>{chunks}</b> };

  const langLinks: { code: Locale; label: string }[] = [
    { code: "en-US", label: "EN" },
    { code: "pt-BR", label: "PT" },
  ];

  const featureCards = [
    { icon: Phone, key: "alwaysOn" },
    { icon: CalendarCheck, key: "books" },
    { icon: Activity, key: "transcripts" },
    { icon: Gauge, key: "analytics" },
  ] as const;

  const steps = ["connect", "configure", "answer", "watch"] as const;

  const galleryCards = [
    {
      key: "dashboard",
      url: "app.relay.so/dashboard",
      src: `${SCREENS}/overview/operations-light-desktop.html`,
      height: 860,
    },
    {
      key: "calls",
      url: "app.relay.so/calls",
      src: `${SCREENS}/calls/table-light-desktop.html`,
      height: 760,
    },
    {
      key: "campaigns",
      url: "app.relay.so/campaigns",
      src: `${SCREENS}/campaigns/running-light-desktop.html`,
      height: 860,
    },
    {
      key: "agents",
      url: "app.relay.so/agents",
      src: `${SCREENS}/agents/roster-light-desktop.html`,
      height: 720,
    },
  ] as const;

  return (
    <div className="mkt">
      <header className="nav">
        <div className="nav-in">
          <MarketingWordmark />
          <nav className="nav-links">
            <a href="#live">{t("nav.live")}</a>
            <a href="#features">{t("nav.features")}</a>
            <a href="#how">{t("nav.how")}</a>
            <a href="#customers">{t("nav.customers")}</a>
          </nav>
          <div className="nav-right">
            <div className="seg lang-seg">
              {langLinks.map(({ code, label }) => (
                <Link
                  key={code}
                  href={`/${localeUrlSlug[code]}`}
                  className={locale === code ? "on" : undefined}
                >
                  {label}
                </Link>
              ))}
            </div>
            <ThemeToggle label={t("nav.toggleTheme")} />
            <Link href="/login" className="mbtn mbtn--ghost mbtn--sm">
              {t("nav.signIn")}
            </Link>
            <Link href="/signup" className="mbtn mbtn--primary mbtn--sm">
              {t("nav.getStarted")}
            </Link>
          </div>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="hero-bg">
          <div className="hero-glow" />
          <div className="hero-grid" />
        </div>
        <div className="container">
          <div className="measure tcenter" style={{ margin: "0 auto" }}>
            <span className="eyebrow reveal">{t("hero.eyebrow")}</span>
            <h1 className="display reveal" style={{ transitionDelay: ".06s" }}>
              {t("hero.title")}
            </h1>
            <p
              className="lead reveal"
              style={{ transitionDelay: ".12s", marginLeft: "auto", marginRight: "auto" }}
            >
              {t("hero.lead")}
            </p>
            <div
              className="hero-cta reveal"
              style={{ transitionDelay: ".18s", justifyContent: "center" }}
            >
              <Link href="/signup" className="mbtn mbtn--primary">
                {t("hero.ctaPrimary")}
              </Link>
              <a href="#live" className="mbtn mbtn--ghost">
                {t("hero.ctaSecondary")}
              </a>
            </div>
            <div
              className="hero-note reveal"
              style={{ transitionDelay: ".24s", justifyContent: "center" }}
            >
              {(["note1", "note2", "note3"] as const).map((note) => (
                <span key={note}>
                  <span className="tick">
                    <Check size={10} strokeWidth={3} />
                  </span>
                  <span>{t(`hero.${note}`)}</span>
                </span>
              ))}
            </div>
          </div>

          <div
            className="float-wrap reveal"
            style={{
              transitionDelay: ".3s",
              marginTop: 54,
              maxWidth: 1080,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            <div data-parallax="26">
              <div className="browser">
                <div className="browser-bar">
                  <span className="dots">
                    <i />
                    <i />
                    <i />
                  </span>
                  <span className="url">
                    <Lock size={11} strokeWidth={2} />
                    app.relay.so/calls/live
                  </span>
                </div>
                <div className="vp" style={{ aspectRatio: "1280/820" }}>
                  <iframe
                    src={`${SCREENS}/live-calls/listening-dark-desktop.html`}
                    width={1280}
                    height={820}
                    scrolling="no"
                    title="Live call monitor"
                  />
                </div>
              </div>
            </div>
            <div className="fchip" style={{ top: "18%", left: "-3%" }}>
              <span className="fdot" style={{ background: "oklch(0.7 0.18 288)" }} />
              Live waveform <small>listening in</small>
            </div>
            <div className="fchip" style={{ bottom: "24%", right: "-4%" }}>
              <span className="fdot" style={{ background: "oklch(0.72 0.16 150)" }} />
              book_appointment <small>appt_8842</small>
            </div>
            <div className="fchip" style={{ bottom: "-3%", left: "14%" }}>
              <span className="fdot" style={{ background: "oklch(0.72 0.16 150)" }} />
              p95 812ms <small>within budget</small>
            </div>
          </div>
        </div>
      </section>

      <section style={{ padding: "8px 0 36px" }}>
        <div className="tcenter reveal container">
          <p
            style={{
              fontSize: 13,
              letterSpacing: ".04em",
              color: "var(--ink3)",
              margin: "0 0 26px",
            }}
          >
            {t("logos.trusted")}
          </p>
        </div>
        <div className="marquee">
          <div className="marquee-track">
            {[...LOGOS, ...LOGOS].map((logo, i) => (
              <span className="logo-item" key={i}>
                {logo}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="live">
        <div className="container">
          <div className="invert" style={{ padding: "clamp(40px,6vw,72px)" }}>
            <div className="invert-glow" />
            <div className="frow" style={{ position: "relative" }}>
              <div className="ftext">
                <span className="eyebrow reveal">{t("live.eyebrow")}</span>
                <h2 className="h2 reveal" style={{ marginTop: 16, transitionDelay: ".05s" }}>
                  {t("live.title")}
                </h2>
                <p className="lead reveal" style={{ marginTop: 18, transitionDelay: ".1s" }}>
                  {t("live.lead")}
                </p>
                <ul className="flist stagger">
                  {(["point1", "point2", "point3"] as const).map((point) => (
                    <li className="reveal" key={point}>
                      <span className="fcheck">
                        <Check size={12} strokeWidth={3} />
                      </span>
                      <span>{t.rich(`live.${point}`, bold)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div
                className="reveal"
                style={{ transitionDelay: ".12s", display: "flex", justifyContent: "center" }}
              >
                <div className="phone">
                  <div className="notch" />
                  <div className="phone-vp">
                    <iframe
                      src={`${SCREENS}/live-calls/listening-dark-mobile.html`}
                      width={390}
                      height={844}
                      scrolling="no"
                      title="Live monitor on mobile"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="features" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="measure reveal">
            <span className="eyebrow">{t("features.eyebrow")}</span>
            <h2 className="h2" style={{ marginTop: 16 }}>
              {t("features.title")}
            </h2>
          </div>
          <div className="cards stagger" style={{ marginTop: 42 }}>
            {featureCards.map(({ icon: Icon, key }) => (
              <div className="card-m reveal" key={key}>
                <div className="card-ico">
                  <Icon size={21} strokeWidth={2} />
                </div>
                <h3 className="h3">{t(`features.${key}.title`)}</h3>
                <p>{t(`features.${key}.body`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="frow">
            <div className="ftext">
              <span className="eyebrow reveal">{t("summary.eyebrow")}</span>
              <h2 className="h2 reveal" style={{ marginTop: 16, transitionDelay: ".05s" }}>
                {t("summary.title")}
              </h2>
              <p className="lead reveal" style={{ marginTop: 18, transitionDelay: ".1s" }}>
                {t("summary.lead")}
              </p>
            </div>
            <div className="reveal" style={{ transitionDelay: ".12s" }}>
              <div className="browser">
                <div className="browser-bar">
                  <span className="dots">
                    <i />
                    <i />
                    <i />
                  </span>
                  <span className="url">app.relay.so/calls/8842</span>
                </div>
                <div className="vp" style={{ aspectRatio: "1280/810" }}>
                  <iframe
                    src={`${SCREENS}/calls/success-light-desktop.html`}
                    width={1280}
                    height={820}
                    scrolling="no"
                    title="Call detail"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="frow rev">
            <div className="ftext">
              <span className="eyebrow reveal">{t("metrics.eyebrow")}</span>
              <h2 className="h2 reveal" style={{ marginTop: 16, transitionDelay: ".05s" }}>
                {t("metrics.title")}
              </h2>
              <p className="lead reveal" style={{ marginTop: 18, transitionDelay: ".1s" }}>
                {t("metrics.lead")}
              </p>
            </div>
            <div className="reveal" style={{ transitionDelay: ".12s" }}>
              <div className="browser">
                <div className="browser-bar">
                  <span className="dots">
                    <i />
                    <i />
                    <i />
                  </span>
                  <span className="url">app.relay.so/analytics</span>
                </div>
                <div className="vp" style={{ aspectRatio: "1280/800" }}>
                  <iframe
                    src={`${SCREENS}/overview/success-light-desktop.html`}
                    width={1280}
                    height={1180}
                    scrolling="no"
                    title="Analytics"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="pin" id="product">
        <div className="pin-stick">
          <div className="pin-head">
            <span className="eyebrow reveal">{t("gallery.eyebrow")}</span>
            <h2 className="h2 reveal" style={{ marginTop: 14, maxWidth: 640 }}>
              {t("gallery.title")}
            </h2>
          </div>
          <div className="track">
            {galleryCards.map(({ key, url, src, height }) => (
              <div className="track-card" key={key}>
                <div className="track-cap">
                  <span className="badge-sm">{t(`gallery.${key}`)}</span>
                  <span className="mono" style={{ color: "var(--ink3)", fontSize: 12.5 }}>
                    /{key}
                  </span>
                </div>
                <div className="browser">
                  <div className="browser-bar">
                    <span className="dots">
                      <i />
                      <i />
                      <i />
                    </span>
                    <span className="url">{url}</span>
                  </div>
                  <div className="vp" style={{ aspectRatio: "1280/800" }}>
                    <iframe
                      src={src}
                      width={1280}
                      height={height}
                      scrolling="no"
                      title={t(`gallery.${key}`)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="how">
        <div className="container">
          <div className="measure reveal">
            <span className="eyebrow">{t("how.eyebrow")}</span>
            <h2 className="h2" style={{ marginTop: 16 }}>
              {t("how.title")}
            </h2>
          </div>
          <div className="steps stagger" style={{ marginTop: 54 }}>
            {steps.map((step) => (
              <div className="step reveal" key={step}>
                <h4>{t(`how.${step}.title`)}</h4>
                <p>{t(`how.${step}.body`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="invert" style={{ padding: "clamp(44px,6vw,72px)" }}>
            <div className="stats stagger">
              <div className="stat reveal">
                <div className="n grad">
                  <span data-count="900">0</span>ms
                </div>
                <div className="l" style={{ color: "oklch(0.72 0.012 286)" }}>
                  {t("stats.latency")}
                </div>
              </div>
              <div className="stat reveal">
                <div className="n grad">24/7</div>
                <div className="l" style={{ color: "oklch(0.72 0.012 286)" }}>
                  {t("stats.answered")}
                </div>
              </div>
              <div className="stat reveal">
                <div className="n grad">
                  <span data-count="100">0</span>%
                </div>
                <div className="l" style={{ color: "oklch(0.72 0.012 286)" }}>
                  {t("stats.transcribed")}
                </div>
              </div>
              <div className="stat reveal">
                <div className="n grad">
                  <span data-count="2">0</span>
                </div>
                <div className="l" style={{ color: "oklch(0.72 0.012 286)" }}>
                  {t("stats.languages")}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="customers" style={{ paddingTop: 0 }}>
        <div className="measure tcenter container" style={{ margin: "0 auto" }}>
          <div
            className="reveal"
            style={{
              color: "var(--brand)",
              display: "flex",
              justifyContent: "center",
              marginBottom: 22,
            }}
          >
            <BarsGlyph size={30} />
          </div>
          <p className="quote-big reveal" style={{ transitionDelay: ".05s" }}>
            {t("testimonial.quote")}
          </p>
          <div
            className="reveal"
            style={{
              transitionDelay: ".1s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              marginTop: 26,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 99,
                background: "color-mix(in oklch,var(--brand) 16%,transparent)",
                color: "var(--brand)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 600,
              }}
            >
              RM
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontWeight: 600 }}>{t("testimonial.name")}</div>
              <div style={{ fontSize: 13.5, color: "var(--ink3)" }}>{t("testimonial.org")}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="cta" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="cta-band reveal">
            <h2 className="h2">{t("cta.title")}</h2>
            <p
              style={{
                fontSize: 17,
                opacity: 0.92,
                maxWidth: 520,
                margin: "16px auto 0",
              }}
            >
              {t("cta.lead")}
            </p>
            <div className="btn-row" style={{ justifyContent: "center", marginTop: 28 }}>
              <Link href="/signup" className="mbtn mbtn--primary">
                {t("cta.primary")}
              </Link>
              <Link href="/login" className="mbtn mbtn--ghost">
                {t("cta.secondary")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="foot">
        <div className="container">
          <div className="foot-grid">
            <div style={{ maxWidth: 280 }}>
              <MarketingWordmark />
              <p
                style={{
                  fontSize: 13.5,
                  color: "var(--ink3)",
                  lineHeight: 1.6,
                  margin: "14px 0 0",
                }}
              >
                {t("footer.tagline")}
              </p>
            </div>
            <div className="foot-col">
              <h5>{t("footer.product")}</h5>
              <a href="#live">{t("nav.live")}</a>
              <a href="#features">{t("nav.features")}</a>
              <a href="#product">{t("footer.screens")}</a>
              <a href="#how">{t("nav.how")}</a>
            </div>
          </div>
          <div className="foot-bottom">
            <span>{t("footer.copyright", { year: new Date().getFullYear() })}</span>
            <span style={{ display: "flex", gap: 18 }}>
              <a href="#top">{t("footer.privacy")}</a>
              <a href="#top">{t("footer.terms")}</a>
              <span>America/São_Paulo</span>
            </span>
          </div>
        </div>
      </footer>

      <MarketingEnhancer />
    </div>
  );
}
