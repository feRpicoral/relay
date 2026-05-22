import type { Locale as PrismaLocale } from "@prisma/client";

export const locales = ["en-US", "pt-BR"] as const satisfies readonly string[];
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en-US";

export const localeUrlSlug = {
  "en-US": "en",
  "pt-BR": "pt-br",
} as const;

export type LocaleUrlSlug = (typeof localeUrlSlug)[Locale];

const slugToLocaleMap: Record<LocaleUrlSlug, Locale> = {
  en: "en-US",
  "pt-br": "pt-BR",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}

export function isUrlSlug(value: unknown): value is LocaleUrlSlug {
  return typeof value === "string" && value in slugToLocaleMap;
}

export function slugToLocale(slug: string): Locale | null {
  if (!isUrlSlug(slug)) return null;
  return slugToLocaleMap[slug];
}

const prismaToBcp47: Record<PrismaLocale, Locale> = {
  EN_US: "en-US",
  PT_BR: "pt-BR",
};

const bcp47ToPrisma: Record<Locale, PrismaLocale> = {
  "en-US": "EN_US",
  "pt-BR": "PT_BR",
};

export function fromPrismaLocale(value: PrismaLocale): Locale {
  return prismaToBcp47[value];
}

export function toPrismaLocale(value: Locale): PrismaLocale {
  return bcp47ToPrisma[value];
}
