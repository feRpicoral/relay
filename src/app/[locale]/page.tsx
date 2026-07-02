import { Activity, CalendarCheck, Check, Gauge, Lock, Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";

import { MarketingEffects } from "@/components/marketing/marketing-effects";
import { ThemeToggle } from "@/components/marketing/theme-toggle";
import { BarsGlyph, MarketingWordmark } from "@/components/marketing/wordmark";
import { defaultLocale, type Locale, localeUrlSlug, slugToLocale } from "@/i18n/config";

import styles from "./page.module.css";

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

const LANG_LINKS: { code: Locale; label: string }[] = [
  { code: "en-US", label: "EN" },
  { code: "pt-BR", label: "PT" },
];

const FEATURE_CARDS = [
  { icon: Phone, key: "alwaysOn" },
  { icon: CalendarCheck, key: "books" },
  { icon: Activity, key: "transcripts" },
  { icon: Gauge, key: "analytics" },
] as const;

const STEPS = ["connect", "configure", "answer", "watch"] as const;

const GALLERY_CARDS = [
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

  return (
    <main className={styles.page}>
      <MarketingEffects />

      <header className={styles.nav} data-marketing-nav>
        <div className={styles.navIn}>
          <MarketingWordmark className={styles.wordmark} badgeClassName={styles.wmBadge} />
          <nav className={styles.navLinks}>
            <a href="#live">{t("nav.live")}</a>
            <a href="#features">{t("nav.features")}</a>
            <a href="#how">{t("nav.how")}</a>
            <a href="#customers">{t("nav.customers")}</a>
          </nav>
          <div className={styles.navRight}>
            <div className={styles.seg}>
              {LANG_LINKS.map(({ code, label }) => (
                <Link
                  key={code}
                  href={`/${localeUrlSlug[code]}`}
                  className={locale === code ? styles.on : undefined}
                >
                  {label}
                </Link>
              ))}
            </div>
            <ThemeToggle className={styles.iconBtn} label={t("nav.toggleTheme")} />
            <Link href="/login" className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`}>
              {t("nav.signIn")}
            </Link>
            <Link href="/signup" className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`}>
              {t("nav.getStarted")}
            </Link>
          </div>
        </div>
      </header>

      <section className={styles.hero} id="top">
        <div className={styles.heroBg}>
          <div className={styles.heroGlow} />
          <div className={styles.heroGrid} />
        </div>
        <div className={styles.wrap}>
          <div className={`${styles.measureCenter} ${styles.tcenter}`}>
            <span className={`${styles.eyebrow} ${styles.reveal}`}>{t("hero.eyebrow")}</span>
            <h1 className={`${styles.display} ${styles.reveal}`} style={{ animationDelay: "60ms" }}>
              {t("hero.title")}
            </h1>
            <p
              className={`${styles.lead} ${styles.heroLead} ${styles.reveal}`}
              style={{ animationDelay: "120ms" }}
            >
              {t("hero.lead")}
            </p>
            <div
              className={`${styles.heroCta} ${styles.reveal}`}
              style={{ animationDelay: "180ms" }}
            >
              <Link href="/signup" className={`${styles.btn} ${styles.btnPrimary}`}>
                {t("hero.ctaPrimary")}
              </Link>
              <a href="#live" className={`${styles.btn} ${styles.btnGhost}`}>
                {t("hero.ctaSecondary")}
              </a>
            </div>
            <div
              className={`${styles.heroNote} ${styles.reveal}`}
              style={{ animationDelay: "240ms" }}
            >
              {(["note1", "note2", "note3"] as const).map((note) => (
                <span key={note}>
                  <span className={styles.tick}>
                    <Check size={10} strokeWidth={3} />
                  </span>
                  {t(`hero.${note}`)}
                </span>
              ))}
            </div>
          </div>

          <div
            className={`${styles.floatWrap} ${styles.reveal}`}
            style={{ animationDelay: "300ms" }}
          >
            <div data-marketing-parallax>
              <div className={styles.browser}>
                <div className={styles.browserBar}>
                  <span className={styles.dots}>
                    <i />
                    <i />
                    <i />
                  </span>
                  <span className={styles.url}>
                    <Lock size={11} strokeWidth={2} />
                    app.relay.so/calls/live
                  </span>
                </div>
                <div className={styles.shot} data-marketing-shot="1280">
                  <iframe
                    src={`${SCREENS}/live-calls/listening-dark-desktop.html`}
                    title="Live call monitor"
                    tabIndex={-1}
                  />
                </div>
              </div>
            </div>
            <div className={styles.fchip} style={{ top: "18%", left: "-3%" }}>
              <span className={styles.fdot} style={{ background: "oklch(0.7 0.18 288)" }} />
              Live waveform <small>listening in</small>
            </div>
            <div className={styles.fchip} style={{ bottom: "24%", right: "-4%" }}>
              <span className={styles.fdot} style={{ background: "oklch(0.72 0.16 150)" }} />
              book_appointment <small>appt_8842</small>
            </div>
            <div className={styles.fchip} style={{ bottom: "-3%", left: "14%" }}>
              <span className={styles.fdot} style={{ background: "oklch(0.72 0.16 150)" }} />
              p95 812ms <small>within budget</small>
            </div>
          </div>
        </div>
      </section>

      <section style={{ padding: "8px 0 36px" }}>
        <div className={`${styles.wrap} ${styles.tcenter} ${styles.reveal}`}>
          <p
            style={{
              fontSize: 13,
              letterSpacing: ".04em",
              color: "var(--ink-3)",
              margin: "0 0 26px",
            }}
          >
            {t("logos.trusted")}
          </p>
        </div>
        <div className={styles.marquee}>
          <div className={styles.marqueeTrack}>
            {[...LOGOS, ...LOGOS].map((logo, i) => (
              <span className={styles.logoItem} key={i}>
                {logo}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.section} id="live">
        <div className={styles.wrap}>
          <div className={styles.invert}>
            <div className={styles.invertGlow} />
            <div className={styles.frow} style={{ position: "relative" }}>
              <div className={styles.ftext}>
                <span className={`${styles.eyebrow} ${styles.reveal}`}>{t("live.eyebrow")}</span>
                <h2 className={`${styles.h2} ${styles.reveal}`} style={{ marginTop: 16 }}>
                  {t("live.title")}
                </h2>
                <p className={`${styles.lead} ${styles.reveal}`} style={{ marginTop: 18 }}>
                  {t("live.lead")}
                </p>
                <ul className={styles.flist}>
                  {(["point1", "point2", "point3"] as const).map((point, i) => (
                    <li
                      className={styles.reveal}
                      key={point}
                      style={{ animationDelay: `${i * 80}ms` }}
                    >
                      <span className={styles.fcheck}>
                        <Check size={12} strokeWidth={3} />
                      </span>
                      <span>{t.rich(`live.${point}`, bold)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className={styles.reveal} style={{ display: "flex", justifyContent: "center" }}>
                <div className={styles.phone}>
                  <div className={styles.notch} />
                  <div className={styles.phoneShot} data-marketing-shot="390">
                    <iframe
                      src={`${SCREENS}/live-calls/listening-dark-mobile.html`}
                      title="Live monitor on mobile"
                      loading="lazy"
                      tabIndex={-1}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section} id="features" style={{ paddingTop: 0 }}>
        <div className={styles.wrap}>
          <div className={`${styles.measure} ${styles.reveal}`}>
            <span className={styles.eyebrow}>{t("features.eyebrow")}</span>
            <h2 className={styles.h2} style={{ marginTop: 16 }}>
              {t("features.title")}
            </h2>
          </div>
          <div className={styles.cards}>
            {FEATURE_CARDS.map(({ icon: Icon, key }, i) => (
              <div
                className={`${styles.cardM} ${styles.reveal}`}
                key={key}
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className={styles.cardIco}>
                  <Icon size={21} strokeWidth={2} />
                </div>
                <h3 className={styles.h3}>{t(`features.${key}.title`)}</h3>
                <p>{t(`features.${key}.body`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.section} style={{ paddingTop: 0 }}>
        <div className={styles.wrap}>
          <div className={styles.frow}>
            <div className={styles.ftext}>
              <span className={`${styles.eyebrow} ${styles.reveal}`}>{t("summary.eyebrow")}</span>
              <h2 className={`${styles.h2} ${styles.reveal}`} style={{ marginTop: 16 }}>
                {t("summary.title")}
              </h2>
              <p className={`${styles.lead} ${styles.reveal}`} style={{ marginTop: 18 }}>
                {t("summary.lead")}
              </p>
            </div>
            <div className={styles.reveal}>
              <div className={styles.browser}>
                <div className={styles.browserBar}>
                  <span className={styles.dots}>
                    <i />
                    <i />
                    <i />
                  </span>
                  <span className={styles.url}>app.relay.so/calls/8842</span>
                </div>
                <div className={styles.shot} data-marketing-shot="1280">
                  <iframe
                    src={`${SCREENS}/calls/success-light-desktop.html`}
                    title="Call detail"
                    loading="lazy"
                    tabIndex={-1}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section} style={{ paddingTop: 0 }}>
        <div className={styles.wrap}>
          <div className={`${styles.frow} ${styles.rev}`}>
            <div className={styles.ftext}>
              <span className={`${styles.eyebrow} ${styles.reveal}`}>{t("metrics.eyebrow")}</span>
              <h2 className={`${styles.h2} ${styles.reveal}`} style={{ marginTop: 16 }}>
                {t("metrics.title")}
              </h2>
              <p className={`${styles.lead} ${styles.reveal}`} style={{ marginTop: 18 }}>
                {t("metrics.lead")}
              </p>
            </div>
            <div className={styles.reveal}>
              <div className={styles.browser}>
                <div className={styles.browserBar}>
                  <span className={styles.dots}>
                    <i />
                    <i />
                    <i />
                  </span>
                  <span className={styles.url}>app.relay.so/analytics</span>
                </div>
                <div className={styles.shot} data-marketing-shot="1280">
                  <iframe
                    src={`${SCREENS}/overview/success-light-desktop.html`}
                    title="Analytics"
                    loading="lazy"
                    tabIndex={-1}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.pin} id="product">
        <div className={styles.pinStick}>
          <div className={styles.pinHead}>
            <span className={`${styles.eyebrow} ${styles.reveal}`}>{t("gallery.eyebrow")}</span>
            <h2
              className={`${styles.h2} ${styles.reveal}`}
              style={{ marginTop: 14, maxWidth: 640 }}
            >
              {t("gallery.title")}
            </h2>
          </div>
          <div className={styles.track} data-marketing-gallery>
            {GALLERY_CARDS.map(({ key, url, src, height }) => (
              <div className={styles.trackCard} key={key}>
                <div className={styles.trackCap}>
                  <span className={styles.badgeSm}>{t(`gallery.${key}`)}</span>
                  <span className={styles.mono} style={{ color: "var(--ink-3)", fontSize: 12.5 }}>
                    /{key}
                  </span>
                </div>
                <div className={styles.browser}>
                  <div className={styles.browserBar}>
                    <span className={styles.dots}>
                      <i />
                      <i />
                      <i />
                    </span>
                    <span className={styles.url}>{url}</span>
                  </div>
                  <div className={styles.shot} data-marketing-shot="1280">
                    <iframe
                      src={src}
                      title={t(`gallery.${key}`)}
                      loading="lazy"
                      tabIndex={-1}
                      height={height}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.section} id="how">
        <div className={styles.wrap}>
          <div className={`${styles.measure} ${styles.reveal}`}>
            <span className={styles.eyebrow}>{t("how.eyebrow")}</span>
            <h2 className={styles.h2} style={{ marginTop: 16 }}>
              {t("how.title")}
            </h2>
          </div>
          <div className={styles.steps}>
            {STEPS.map((step, i) => (
              <div
                className={`${styles.step} ${styles.reveal}`}
                key={step}
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <h4>{t(`how.${step}.title`)}</h4>
                <p>{t(`how.${step}.body`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.section} style={{ paddingTop: 0 }}>
        <div className={styles.wrap}>
          <div className={styles.invert}>
            <div className={styles.stats}>
              <div className={styles.reveal}>
                <div className={`${styles.statN} ${styles.grad}`}>
                  <span data-marketing-count="900">0</span>ms
                </div>
                <div className={styles.statL}>{t("stats.latency")}</div>
              </div>
              <div className={styles.reveal} style={{ animationDelay: "80ms" }}>
                <div className={`${styles.statN} ${styles.grad}`}>24/7</div>
                <div className={styles.statL}>{t("stats.answered")}</div>
              </div>
              <div className={styles.reveal} style={{ animationDelay: "160ms" }}>
                <div className={`${styles.statN} ${styles.grad}`}>
                  <span data-marketing-count="100">0</span>%
                </div>
                <div className={styles.statL}>{t("stats.transcribed")}</div>
              </div>
              <div className={styles.reveal} style={{ animationDelay: "240ms" }}>
                <div className={`${styles.statN} ${styles.grad}`}>
                  <span data-marketing-count="2">0</span>
                </div>
                <div className={styles.statL}>{t("stats.languages")}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section} id="customers" style={{ paddingTop: 0 }}>
        <div className={`${styles.wrap} ${styles.measureCenter} ${styles.tcenter}`}>
          <div className={`${styles.quoteMark} ${styles.reveal}`}>
            <BarsGlyph size={30} />
          </div>
          <p className={`${styles.quoteBig} ${styles.reveal}`} style={{ animationDelay: "60ms" }}>
            {t("testimonial.quote")}
          </p>
          <div
            className={`${styles.quoteWho} ${styles.reveal}`}
            style={{ animationDelay: "120ms" }}
          >
            <div className={styles.quoteAvatar}>RM</div>
            <div style={{ textAlign: "left" }}>
              <div className={styles.quoteName}>{t("testimonial.name")}</div>
              <div className={styles.quoteOrg}>{t("testimonial.org")}</div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section} id="cta" style={{ paddingTop: 0 }}>
        <div className={styles.wrap}>
          <div className={`${styles.ctaBand} ${styles.reveal}`}>
            <h2 className={styles.h2}>{t("cta.title")}</h2>
            <p>{t("cta.lead")}</p>
            <div className={styles.btnRow} style={{ justifyContent: "center", marginTop: 28 }}>
              <Link href="/signup" className={`${styles.btn} ${styles.btnPrimary}`}>
                {t("cta.primary")}
              </Link>
              <Link href="/login" className={`${styles.btn} ${styles.btnGhost}`}>
                {t("cta.secondary")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className={styles.foot}>
        <div className={styles.wrap}>
          <div className={styles.footGrid}>
            <div>
              <MarketingWordmark className={styles.wordmark} badgeClassName={styles.wmBadge} />
              <p className={styles.footTagline}>{t("footer.tagline")}</p>
            </div>
            <div className={styles.footCol}>
              <h5>{t("footer.product")}</h5>
              <a href="#live">{t("nav.live")}</a>
              <a href="#features">{t("nav.features")}</a>
              <a href="#product">{t("footer.screens")}</a>
              <a href="#how">{t("nav.how")}</a>
            </div>
          </div>
          <div className={styles.footBottom}>
            <span>{t("footer.copyright", { year: new Date().getFullYear() })}</span>
            <span style={{ display: "flex", gap: 18 }}>
              <a href="#top">{t("footer.privacy")}</a>
              <a href="#top">{t("footer.terms")}</a>
              <span>America/São_Paulo</span>
            </span>
          </div>
        </div>
      </footer>
    </main>
  );
}
