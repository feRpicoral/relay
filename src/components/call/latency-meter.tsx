"use client";

import { useMemo } from "react";

import { useRealtimeList } from "@/hooks/use-realtime";
import { LEG_BUDGET_MS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface MetricRow {
  id: string;
  call_id: string;
  leg: "STT_FINALIZE" | "LLM_TTFT" | "LLM_TOTAL" | "TTS_TTFA" | "TOOL_TOTAL" | "END_TO_END";
  value_ms: number;
  occurred_at: string;
}

const LEG_LABELS: Record<MetricRow["leg"], string> = {
  STT_FINALIZE: "STT",
  LLM_TTFT: "LLM TTFT",
  LLM_TOTAL: "LLM",
  TTS_TTFA: "TTS",
  TOOL_TOTAL: "Tool",
  END_TO_END: "Total",
};

interface LatencyMeterProps {
  callId: string;
  initial: Array<{ id: string; leg: MetricRow["leg"]; valueMs: number; occurredAt: string }>;
}

export function LatencyMeter({ callId, initial }: LatencyMeterProps) {
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

  // Scope realtime to this call so we don't re-render on every other call's
  // metrics across the org.
  const rows = useRealtimeList<MetricRow>({
    table: "call_metrics",
    filter: `call_id=eq.${callId}`,
    channelKey: `latency-meter:${callId}`,
    initial: initialRows,
  });

  const aggregates = useMemo(() => {
    const out: Record<string, { last: number; avg: number; p95: number }> = {};
    const groups: Record<string, number[]> = {};
    for (const r of rows) {
      const bucket = groups[r.leg] ?? [];
      bucket.push(r.value_ms);
      groups[r.leg] = bucket;
    }
    for (const [leg, values] of Object.entries(groups)) {
      const sorted = [...values].sort((a, b) => a - b);
      const avg = sorted.reduce((s, v) => s + v, 0) / sorted.length;
      const p95Idx = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
      out[leg] = { last: values[values.length - 1] ?? 0, avg, p95: sorted[p95Idx] ?? 0 };
    }
    return out;
  }, [rows]);

  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
      {(
        ["END_TO_END", "LLM_TTFT", "TTS_TTFA", "LLM_TOTAL", "TOOL_TOTAL", "STT_FINALIZE"] as const
      ).map((leg) => {
        const agg = aggregates[leg];
        if (!agg) {
          return (
            <div key={leg} className="border-border bg-card/40 rounded-md border p-3">
              <p className="text-muted-foreground text-xs">{LEG_LABELS[leg]}</p>
              <p className="text-muted-foreground mt-1 font-mono text-sm">-</p>
            </div>
          );
        }
        const budget = LEG_BUDGET_MS[leg];
        const overBudget = agg.last > budget;
        return (
          <div
            key={leg}
            className={cn(
              "bg-card/40 rounded-md border p-3 transition-colors",
              overBudget ? "border-destructive/40" : "border-border",
            )}
          >
            <p className="text-muted-foreground text-xs">{LEG_LABELS[leg]}</p>
            <p
              className={cn(
                "mt-1 font-mono text-sm",
                overBudget ? "text-destructive" : "text-foreground",
              )}
            >
              {Math.round(agg.last)}
              <span className="text-muted-foreground text-xs">ms</span>
            </p>
            <p className="text-muted-foreground mt-1 text-[10px]">
              p95 {Math.round(agg.p95)}ms, alvo {budget}ms
            </p>
          </div>
        );
      })}
    </div>
  );
}
