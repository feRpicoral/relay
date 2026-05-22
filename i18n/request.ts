import { getRequestConfig } from "next-intl/server";

import { resolveLocale } from "@/lib/i18n/resolve-locale";

import { isLocale } from "./config";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = isLocale(requested) ? requested : await resolveLocale();
  const messages = (await import(`../messages/${locale}.json`)).default;

  return {
    locale,
    messages,
  };
});
