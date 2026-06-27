"use client";

import { RotateCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";

export function SummaryRefreshButton() {
  const t = useTranslations("calls.detail.summaryProcessing");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => startTransition(() => router.refresh())}
    >
      <RotateCw className={pending ? "size-3.5 animate-spin" : "size-3.5"} />
      {t("refresh")}
    </Button>
  );
}
