"use client";

import * as Sentry from "@sentry/nextjs";
import { AlertTriangle } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { StateCard } from "@/components/ui/state-card";

/**
 * Segment-level error boundary. Lives ABOVE the route-group layouts that
 * mount `NextIntlClientProvider`, so we cannot rely on `useTranslations`
 * here — when an error bubbles this high the provider may not have rendered
 * yet. We read the locale cookie at hydration and pick from a tiny inline
 * map. The root-layout error boundary in `app/global-error.tsx` does the
 * same.
 *
 * `useSyncExternalStore` is the React 19 alternative to `useState +
 * useEffect(setState)`, which the lint rule `react-hooks/set-state-in-effect`
 * forbids.
 */
const STRINGS = {
  "en-US": {
    title: "Something went wrong",
    description: "We've logged the error. Try again in a few seconds.",
    retry: "Try again",
    errorId: (id: string) => `id: ${id}`,
  },
  "pt-BR": {
    title: "Algo deu errado",
    description: "Já registramos o erro. Tente novamente em alguns segundos.",
    retry: "Tentar novamente",
    errorId: (id: string) => `id: ${id}`,
  },
} as const;

type Locale = keyof typeof STRINGS;

function subscribeToCookie(): () => void {
  // Cookies don't fire events; this store snapshots once on hydration.
  return () => {};
}

function readLocaleFromCookie(): Locale {
  const match = document.cookie.match(/(?:^|;\s*)NEXT_LOCALE=([^;]+)/);
  return match?.[1] === "pt-BR" ? "pt-BR" : "en-US";
}

function serverLocale(): Locale {
  return "en-US";
}

export default function SegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const locale = useSyncExternalStore(subscribeToCookie, readLocaleFromCookie, serverLocale);

  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  const t = STRINGS[locale];

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <StateCard
        icon={<AlertTriangle />}
        iconTone="destructive"
        title={t.title}
        description={
          <>
            {t.description}
            {error.digest ? (
              <span className="mt-2 block font-mono text-xs">{t.errorId(error.digest)}</span>
            ) : null}
          </>
        }
        actions={<Button onClick={reset}>{t.retry}</Button>}
      />
    </main>
  );
}
