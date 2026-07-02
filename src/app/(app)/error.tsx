"use client";

import * as Sentry from "@sentry/nextjs";
import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { StateCard } from "@/components/ui/state-card";

export default function SegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors.segmentBoundary");

  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <StateCard
        icon={<AlertTriangle />}
        iconTone="destructive"
        title={t("title")}
        description={
          <>
            {t("description")}
            {error.digest ? (
              <span className="mt-2 block font-mono text-xs">
                {t("errorId", { digest: error.digest })}
              </span>
            ) : null}
          </>
        }
        actions={<Button onClick={reset}>{t("retry")}</Button>}
      />
    </div>
  );
}
