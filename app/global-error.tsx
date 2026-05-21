"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/**
 * Root-layout error boundary. Catches errors thrown by `app/layout.tsx` and
 * the providers it mounts. Must render its own `<html>`/`<body>` because the
 * root layout itself crashed.
 */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="pt-BR">
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
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>Algo deu errado</h1>
          <p style={{ marginTop: 8, color: "#a1a1a1", fontSize: 14 }}>
            Já registramos o erro. Recarregue a página para tentar de novo.
          </p>
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
