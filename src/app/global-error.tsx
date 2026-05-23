"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect, useSyncExternalStore } from "react";

const STRINGS = {
  "en-US": {
    title: "Something went wrong",
    description: "We've already logged the error. Refresh the page to try again.",
  },
  "pt-BR": {
    title: "Algo deu errado",
    description: "Já registramos o erro. Recarregue a página para tentar de novo.",
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

/**
 * Root-layout error boundary. Catches errors thrown by `app/layout.tsx` and
 * the providers it mounts. Must render its own `<html>`/`<body>` because the
 * root layout itself crashed. We cannot depend on `next-intl` here for the
 * same reason — pick locale from the cookie inline via
 * `useSyncExternalStore` (the React 19 alternative to `useState +
 * useEffect(setState)`, which the lint rule forbids).
 */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  const locale = useSyncExternalStore(subscribeToCookie, readLocaleFromCookie, serverLocale);

  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  const t = STRINGS[locale];

  return (
    <html lang={locale}>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
          background: "#0a0a0a",
          color: "#fafafa",
        }}
      >
        <div style={{ maxWidth: 400, padding: "0 24px", textAlign: "center" }}>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>{t.title}</h1>
          <p style={{ marginTop: 8, color: "#a1a1a1", fontSize: 14 }}>{t.description}</p>
          {error.digest ? (
            <p style={{ marginTop: 16, fontFamily: "monospace", fontSize: 12, color: "#737373" }}>
              id: {error.digest}
            </p>
          ) : null}
        </div>
      </body>
    </html>
  );
}
