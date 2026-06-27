"use client";

import { AlertTriangle, Gauge } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

import { Banner } from "@/components/ui/banner";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { useRealtimeList } from "@/hooks/use-realtime";
import {
  aggregateLeg,
  endToEndHealth,
  groupByLeg,
  LATENCY_LEG_ORDER,
  type LatencyLeg,
} from "@/lib/calls/latency";
import { cn } from "@/lib/utils";

interface MetricRow {
  id: string;
  call_id: string;
  leg: LatencyLeg;
  value_ms: number;
  occurred_at: string;
}

interface LatencyMeterProps {
  callId: string;
  initial: Array<{ id: string; leg: LatencyLeg; valueMs: number; occurredAt: string }>;
}

export function LatencyMeter({ callId, initial }: LatencyMeterProps) {
  const t = useTranslations("calls.liveDetail.latency");
  const tLeg = useTranslations("calls.liveDetail.latency.legs");

  const initialRows: MetricRow[] = useMemo(
    () =>
      initial.map((r) => ({
        id: r.id,
        call_id: callId,
        leg: r.leg,
        value_ms: r.valueMs,
        occurred_at: r.occurredAt,
      })),
    [initial, callId],
  );

  const rows = useRealtimeList<MetricRow>({
    table: "call_metrics",
    filter: `call_id=eq.${callId}`,
    channelKey: `latency-meter:${callId}`,
    initial: initialRows,
  });

  const groups = useMemo(() => groupByLeg(rows), [rows]);
  const health = useMemo(() => endToEndHealth(groups), [groups]);

  const healthBadge = !health.hasData
    ? { label: t("noData"), tone: "muted" as const }
    : health.overBudget
      ? { label: t("degraded"), tone: "destructive" as const }
      : { label: t("healthy"), tone: "success" as const };

  return (
    <div className="space-y-4">
      {health.overBudget ? (
        <Banner tone="destructive" icon={<AlertTriangle />}>
          {t("overBudgetBanner", {
            last: health.last,
            p95: health.p95,
            budget: health.budget,
          })}
        </Banner>
      ) : null}

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-5 pt-4 pb-3">
          <div className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
            <Gauge className="size-4" />
            <span className="text-foreground">{t("title")}</span>
            <span className="text-muted-foreground text-xs">
              {t("legCount", { count: LATENCY_LEG_ORDER.length })}
            </span>
          </div>
          <StatusBadge label={healthBadge.label} tone={healthBadge.tone} />
        </div>

        <div className="grid grid-cols-2 gap-2 px-5 md:grid-cols-3">
          {LATENCY_LEG_ORDER.map((leg) => (
            <LatencyCell
              key={leg}
              label={tLeg(leg)}
              agg={aggregateLeg(groups.get(leg) ?? [], leg)}
            />
          ))}
        </div>

        <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4 text-[11px]">
          <LegendItem className="bg-success" label={t("legendWithin")} />
          <LegendItem className="bg-destructive" label={t("legendOver")} />
          <LegendItem className="bg-muted-foreground/50" label={t("legendNoData")} />
        </div>
      </Card>
    </div>
  );
}

function LatencyCell({ label, agg }: { label: string; agg: ReturnType<typeof aggregateLeg> }) {
  const t = useTranslations("calls.liveDetail.latency");
  if (!agg) {
    return (
      <div className="border-border bg-card/40 rounded-md border p-3">
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className="text-muted-foreground mt-1.5 font-mono text-sm">{t("noDataValue")}</p>
        <div className="bg-muted mt-2 h-1 overflow-hidden rounded-full" />
        <div className="text-muted-foreground mt-1.5 flex justify-between text-[10px]">
          <span>—</span>
          <span>{t("budget", { ms: 0 })}</span>
        </div>
      </div>
    );
  }
  return (
    <div
      className={cn(
        "bg-card/40 rounded-md border p-3 transition-colors",
        agg.overBudget ? "border-destructive/40" : "border-border",
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-xs">{label}</p>
        {agg.overBudget ? (
          <span className="text-destructive text-[10px] font-semibold tracking-wide">
            {t("legendOver").toUpperCase()}
          </span>
        ) : null}
      </div>
      <p
        className={cn(
          "mt-1.5 font-mono text-sm",
          agg.overBudget ? "text-destructive" : "text-foreground",
        )}
      >
        {Math.round(agg.last)}
        <span className="text-muted-foreground text-xs">ms</span>
      </p>
      <div className="bg-muted mt-2 h-1 overflow-hidden rounded-full">
        <div
          className={cn("h-full rounded-full", agg.overBudget ? "bg-destructive" : "bg-success")}
          style={{ width: `${agg.fillPercent}%` }}
        />
      </div>
      <div className="text-muted-foreground mt-1.5 flex justify-between text-[10px]">
        <span>{t("p95", { ms: Math.round(agg.p95) })}</span>
        <span>{t("budget", { ms: agg.budget })}</span>
      </div>
    </div>
  );
}

function LegendItem({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("size-2 rounded-full", className)} />
      {label}
    </span>
  );
}
