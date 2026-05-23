import "server-only";

import type { OrgId } from "@/lib/db/types";
import { getDb } from "@/lib/db/with-org";

export interface AnalyticsSummary {
  totalCalls: number;
  attendanceRate: number;
  conversionRate: number;
  avgHandleTimeMs: number;
  totalCostCents: number;
  latencyP50: number;
  latencyP95: number;
}

export interface VolumeBucket {
  day: string; // YYYY-MM-DD
  total: number;
  scheduled: number;
  transferred: number;
  noAnswer: number;
}

export interface HeatmapCell {
  weekday: number; // 0-6 (sunday)
  hour: number; // 0-23
  count: number;
}

export async function loadAnalyticsSummary(
  orgId: OrgId,
  rangeStart: Date,
): Promise<AnalyticsSummary> {
  const db = getDb(orgId);
  const calls = await db.call.findMany({
    where: { startedAt: { gte: rangeStart } },
    select: {
      id: true,
      status: true,
      outcome: true,
      durationMs: true,
      costCents: true,
    },
  });

  const total = calls.length;
  const answered = calls.filter(
    (c) => c.status === "COMPLETED" || c.status === "IN_PROGRESS",
  ).length;
  const converted = calls.filter(
    (c) => c.outcome === "SCHEDULED" || c.outcome === "QUALIFIED",
  ).length;
  const totalDur = calls.reduce((sum, c) => sum + (c.durationMs ?? 0), 0);
  const totalCost = calls.reduce((sum, c) => sum + (c.costCents ?? 0), 0);
  const avgHandleTimeMs = answered === 0 ? 0 : totalDur / answered;

  const metrics = await db.callMetric.findMany({
    where: { leg: "END_TO_END", occurredAt: { gte: rangeStart } },
    select: { valueMs: true },
  });
  const sorted = metrics.map((m) => m.valueMs).sort((a, b) => a - b);
  const p50 = quantile(sorted, 0.5);
  const p95 = quantile(sorted, 0.95);

  return {
    totalCalls: total,
    attendanceRate: total === 0 ? 0 : answered / total,
    conversionRate: total === 0 ? 0 : converted / total,
    avgHandleTimeMs,
    totalCostCents: totalCost,
    latencyP50: p50,
    latencyP95: p95,
  };
}

export async function loadVolumeByDay(orgId: OrgId, rangeStart: Date): Promise<VolumeBucket[]> {
  const db = getDb(orgId);
  const calls = await db.call.findMany({
    where: { startedAt: { gte: rangeStart } },
    select: { startedAt: true, outcome: true },
  });

  const map = new Map<string, VolumeBucket>();
  for (const c of calls) {
    const day = c.startedAt.toISOString().slice(0, 10);
    const bucket = map.get(day) ?? {
      day,
      total: 0,
      scheduled: 0,
      transferred: 0,
      noAnswer: 0,
    };
    bucket.total += 1;
    if (c.outcome === "SCHEDULED") bucket.scheduled += 1;
    if (c.outcome === "TRANSFERRED") bucket.transferred += 1;
    if (c.outcome === "NO_ANSWER") bucket.noAnswer += 1;
    map.set(day, bucket);
  }
  return [...map.values()].sort((a, b) => a.day.localeCompare(b.day));
}

export async function loadHeatmap(orgId: OrgId, rangeStart: Date): Promise<HeatmapCell[]> {
  const db = getDb(orgId);
  const calls = await db.call.findMany({
    where: { startedAt: { gte: rangeStart } },
    select: { startedAt: true },
  });

  const counts: Record<string, number> = {};
  for (const c of calls) {
    const wd = c.startedAt.getDay();
    const h = c.startedAt.getHours();
    const key = `${wd}-${h}`;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  const out: HeatmapCell[] = [];
  for (let wd = 0; wd < 7; wd += 1) {
    for (let h = 0; h < 24; h += 1) {
      out.push({ weekday: wd, hour: h, count: counts[`${wd}-${h}`] ?? 0 });
    }
  }
  return out;
}

export interface AgentRow {
  id: string;
  name: string;
  totalCalls: number;
  conversionRate: number;
  avgHandleTimeMs: number;
}

export async function loadAgentComparison(orgId: OrgId, rangeStart: Date): Promise<AgentRow[]> {
  const db = getDb(orgId);
  const agents = await db.agent.findMany({
    include: {
      calls: {
        where: { startedAt: { gte: rangeStart } },
        select: { outcome: true, durationMs: true },
      },
    },
  });
  return agents
    .map((a) => {
      const total = a.calls.length;
      const converted = a.calls.filter(
        (c) => c.outcome === "SCHEDULED" || c.outcome === "QUALIFIED",
      ).length;
      const durSum = a.calls.reduce((sum, c) => sum + (c.durationMs ?? 0), 0);
      return {
        id: a.id,
        name: a.name,
        totalCalls: total,
        conversionRate: total === 0 ? 0 : converted / total,
        avgHandleTimeMs: total === 0 ? 0 : durSum / total,
      };
    })
    .sort((a, b) => b.totalCalls - a.totalCalls);
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo] ?? 0;
  const a = sorted[lo] ?? 0;
  const b = sorted[hi] ?? 0;
  return Math.round(a + (b - a) * (pos - lo));
}
