import { LEG_BUDGET_MS } from "@/lib/constants";

export type LatencyLeg = keyof typeof LEG_BUDGET_MS;

export const LATENCY_LEG_ORDER: readonly LatencyLeg[] = [
  "END_TO_END",
  "LLM_TTFT",
  "TTS_TTFA",
  "LLM_TOTAL",
  "TOOL_TOTAL",
  "STT_FINALIZE",
];

export interface LegAggregate {
  last: number;
  avg: number;
  p95: number;
  budget: number;
  overBudget: boolean;
  /** Track fill as a 0–100 ratio of last value against budget, capped at 100. */
  fillPercent: number;
}

const FULL_PERCENT = 100;

export function aggregateLeg(values: number[], leg: LatencyLeg): LegAggregate | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const avg = sorted.reduce((s, v) => s + v, 0) / sorted.length;
  const p95Idx = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
  const last = values[values.length - 1] ?? 0;
  const budget = LEG_BUDGET_MS[leg];
  return {
    last,
    avg,
    p95: sorted[p95Idx] ?? 0,
    budget,
    overBudget: last > budget,
    fillPercent: Math.min(FULL_PERCENT, Math.round((last / budget) * FULL_PERCENT)),
  };
}

export function groupByLeg(
  rows: Array<{ leg: string; value_ms: number }>,
): Map<LatencyLeg, number[]> {
  const groups = new Map<LatencyLeg, number[]>();
  for (const r of rows) {
    if (!(r.leg in LEG_BUDGET_MS)) continue;
    const leg = r.leg as LatencyLeg;
    const bucket = groups.get(leg) ?? [];
    bucket.push(r.value_ms);
    groups.set(leg, bucket);
  }
  return groups;
}

export interface EndToEndHealth {
  hasData: boolean;
  overBudget: boolean;
  last: number;
  p95: number;
  budget: number;
}

/**
 * End-to-end health drives the aggregate Healthy/Degraded badge and the
 * over-budget banner. Degraded is gated on the END_TO_END leg specifically,
 * matching the design's "End-to-end latency over budget" banner.
 */
export function endToEndHealth(groups: Map<LatencyLeg, number[]>): EndToEndHealth {
  const agg = aggregateLeg(groups.get("END_TO_END") ?? [], "END_TO_END");
  if (!agg) {
    return {
      hasData: false,
      overBudget: false,
      last: 0,
      p95: 0,
      budget: LEG_BUDGET_MS.END_TO_END,
    };
  }
  return {
    hasData: true,
    overBudget: agg.overBudget,
    last: Math.round(agg.last),
    p95: Math.round(agg.p95),
    budget: agg.budget,
  };
}
