"use client";

import * as Sentry from "@sentry/nextjs";
import { TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { StateCard } from "@/components/ui/state-card";

export default function AnalyticsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("analytics.error");

  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <StateCard
        icon={<TriangleAlert />}
        iconTone="destructive"
        title={t("title")}
        description={t("description")}
        actions={<Button onClick={reset}>{t("retry")}</Button>}
      />
    </div>
  );
}
