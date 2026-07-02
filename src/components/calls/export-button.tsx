"use client";

import { Upload } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

export function ExportButton() {
  const t = useTranslations("calls.list");
  const params = useSearchParams();
  const usp = new URLSearchParams(params.toString());
  usp.delete("page");
  const query = usp.toString();

  return (
    <Button asChild variant="outline" size="sm">
      <Link href={query ? `/calls/export?${query}` : "/calls/export"} prefetch={false}>
        <Upload className="size-3.5" />
        {t("export")}
      </Link>
    </Button>
  );
}
