import type { CallOutcome, CallStatus } from "@prisma/client";

export interface PeriodMetrics {
  totalCalls: number;
  attendanceRate: number;
  conversionRate: number;
  avgHandleTimeMs: number;
  totalCostCents: number;
  latencyP50: number;
  latencyP95: number;
}

export interface CallRow {
  status: CallStatus;
  outcome: CallOutcome | null;
  durationMs: number | null;
  costCents: number | null;
}

export const ANSWERED_STATUSES: CallStatus[] = ["COMPLETED", "IN_PROGRESS"];
export const CONVERTED_OUTCOMES: CallOutcome[] = ["SCHEDULED", "QUALIFIED"];

export function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo] ?? 0;
  const a = sorted[lo] ?? 0;
  const b = sorted[hi] ?? 0;
  return Math.round(a + (b - a) * (pos - lo));
}

export function computePeriodMetrics(calls: CallRow[], latencySamples: number[]): PeriodMetrics {
  const total = calls.length;
  const answered = calls.filter((c) => ANSWERED_STATUSES.includes(c.status)).length;
  const converted = calls.filter(
    (c) => c.outcome != null && CONVERTED_OUTCOMES.includes(c.outcome),
  ).length;
  const totalDur = calls.reduce((sum, c) => sum + (c.durationMs ?? 0), 0);
  const totalCost = calls.reduce((sum, c) => sum + (c.costCents ?? 0), 0);

  const sorted = [...latencySamples].sort((a, b) => a - b);

  return {
    totalCalls: total,
    attendanceRate: total === 0 ? 0 : answered / total,
    conversionRate: total === 0 ? 0 : converted / total,
    avgHandleTimeMs: answered === 0 ? 0 : totalDur / answered,
    totalCostCents: totalCost,
    latencyP50: quantile(sorted, 0.5),
    latencyP95: quantile(sorted, 0.95),
  };
}

/** Percentage change vs. previous period; 0 when the previous period had no calls. */
export function deltaPct(current: number, previous: number): number {
  if (previous === 0) return 0;
  return Math.round(((current - previous) / previous) * 100);
}

/** Difference in percentage points (rates are 0..1), rounded to whole points. */
export function deltaPoints(current: number, previous: number): number {
  return Math.round((current - previous) * 100);
}
