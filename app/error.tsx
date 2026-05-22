"use client";

import * as Sentry from "@sentry/nextjs";
import { AlertTriangle } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";

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
      <div className="max-w-md space-y-4 text-center">
        <div className="bg-destructive/10 text-destructive mx-auto flex h-12 w-12 items-center justify-center rounded-full">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
        <p className="text-muted-foreground text-sm">{t.description}</p>
        {error.digest ? (
          <p className="text-muted-foreground font-mono text-xs">{t.errorId(error.digest)}</p>
        ) : null}
        <Button onClick={reset}>{t.retry}</Button>
      </div>
    </main>
  );
}
