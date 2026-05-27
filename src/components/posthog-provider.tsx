"use client";

import * as Sentry from "@sentry/nextjs";
import { useLocale } from "next-intl";
import { useEffect } from "react";

import { ensurePostHog, posthog } from "@/lib/posthog/client";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const locale = useLocale();

  useEffect(() => {
    ensurePostHog();
  }, []);

  useEffect(() => {
    // Tag every analytics user record + Sentry event with the active UI
    // locale. Useful for cohort breakdowns and for triaging localization
    // bugs ("only fires on pt-BR").
    try {
      posthog.people.set({ locale });
    } catch {
      /* PostHog may not be initialized before the first locale effect. */
    }
    Sentry.setTag("locale", locale);
  }, [locale]);

  return <>{children}</>;
}
