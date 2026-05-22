"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type RangeKey = "7d" | "30d" | "90d";

const RANGES: RangeKey[] = ["7d", "30d", "90d"];

export function RangePicker({ value }: { value: string }) {
  const t = useTranslations("analytics.rangePicker");
  const router = useRouter();
  const params = useSearchParams();

  function onChange(next: string) {
    const usp = new URLSearchParams(params.toString());
    usp.set("range", next);
    router.push(`?${usp.toString()}`);
  }

  const labelFor = (key: RangeKey) => {
    if (key === "7d") return t("days7");
    if (key === "30d") return t("days30");
    return t("days90");
  };

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-44">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {RANGES.map((r) => (
          <SelectItem key={r} value={r}>
            {labelFor(r)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
