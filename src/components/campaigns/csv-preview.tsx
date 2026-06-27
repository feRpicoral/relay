"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";

import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ParsedLeads, ParseLeadError } from "@/lib/campaigns/parse-leads";
import { formatPhone } from "@/lib/utils";

const PREVIEW_ROW_LIMIT = 100;

type PreviewRow =
  | { kind: "valid"; phone: string; name?: string }
  | { kind: "invalid"; phone: string; error: ParseLeadError };

export function CsvPreview({ parsed }: { parsed: ParsedLeads }) {
  const t = useTranslations("campaigns.new.form.preview");

  if (parsed.missingHeader) {
    return <Card className="text-muted-foreground p-4 text-sm">{t("missingHeader")}</Card>;
  }

  const rows: PreviewRow[] = [
    ...parsed.valid.map((l) => ({ kind: "valid" as const, phone: l.phone, name: l.name })),
    ...parsed.invalid.map((r) => ({ kind: "invalid" as const, phone: r.phone, error: r.error })),
  ].slice(0, PREVIEW_ROW_LIMIT);

  const invalidCount = parsed.invalid.length;

  return (
    <Card className="overflow-hidden">
      <div className="border-border flex items-center justify-between gap-2 border-b px-3.5 py-2.5">
        <span className="text-sm font-semibold">{t("title")}</span>
        <div className="flex items-center gap-2">
          <StatusBadge tone="success" label={t("valid", { count: parsed.valid.length })} />
          {invalidCount > 0 ? (
            <StatusBadge tone="destructive" label={t("invalid", { count: invalidCount })} />
          ) : null}
        </div>
      </div>

      <div className="max-h-48 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("colPhone")}</TableHead>
              <TableHead>{t("colName")}</TableHead>
              <TableHead className="text-right">{t("colStatus")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow key={`${row.phone}-${i}`}>
                <TableCell
                  className={`font-mono ${row.kind === "invalid" ? "text-destructive" : "text-foreground"}`}
                >
                  {row.kind === "valid" ? formatPhone(row.phone) : row.phone || t("unnamed")}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {row.kind === "valid" ? (row.name ?? t("unnamed")) : t("unnamed")}
                </TableCell>
                <TableCell className="text-right">
                  {row.kind === "valid" ? (
                    <span className="text-success inline-flex justify-end">
                      <CheckCircle2 className="size-4" />
                    </span>
                  ) : (
                    <span className="text-destructive inline-flex items-center justify-end gap-1.5 text-[11.5px]">
                      <XCircle className="size-3.5" />
                      {row.error === "INVALID_E164" ? t("invalidE164") : t("missingPhone")}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="border-border text-muted-foreground border-t px-3.5 py-2.5 text-xs">
        {invalidCount > 0
          ? t.rich("summary", {
              invalid: invalidCount,
              valid: parsed.valid.length,
              b: (chunks) => <b className="text-foreground font-semibold">{chunks}</b>,
            })
          : t("allValid", { valid: parsed.valid.length })}
      </div>
    </Card>
  );
}
