"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { SegmentedControl } from "@/components/ui/segmented-control";

type RangeKey = "7d" | "30d" | "90d";

const RANGES: RangeKey[] = ["7d", "30d", "90d"];

export function RangePicker({ value }: { value: string }) {
  const t = useTranslations("analytics.rangePicker");
  const router = useRouter();
  const params = useSearchParams();

  function onChange(next: RangeKey) {
    const usp = new URLSearchParams(params.toString());
    usp.set("range", next);
    router.push(`?${usp.toString()}`);
  }

  return (
    <SegmentedControl
      aria-label={t("label")}
      value={(value as RangeKey) ?? "7d"}
      onValueChange={onChange}
      options={RANGES.map((r) => ({ value: r, label: r }))}
    />
  );
}
