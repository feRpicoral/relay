"use client";

import * as Sentry from "@sentry/nextjs";
import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

/**
 * Segment-level error boundary. Catches errors thrown by RSCs/client
 * components below this segment. The root-layout error boundary lives in
 * `app/global-error.tsx`.
 */
export default function SegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Next.js error boundaries don't auto-forward to Sentry; explicit capture
    // is required.
    Sentry.captureException(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-md space-y-4 text-center">
        <div className="bg-destructive/10 text-destructive mx-auto flex h-12 w-12 items-center justify-center rounded-full">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Algo deu errado</h1>
        <p className="text-muted-foreground text-sm">
          Já registramos o erro. Tente novamente em alguns segundos.
        </p>
        {error.digest ? (
          <p className="text-muted-foreground font-mono text-xs">id: {error.digest}</p>
        ) : null}
        <Button onClick={reset}>Tentar novamente</Button>
      </div>
    </main>
  );
}
