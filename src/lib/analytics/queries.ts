import "server-only";

import type { CallOutcome, CallStatus } from "@prisma/client";

import {
  ANSWERED_STATUSES,
  computePeriodMetrics,
  CONVERTED_OUTCOMES,
  deltaPct,
  deltaPoints,
  quantile,
} from "@/lib/analytics/metrics";
import { DEFAULT_TIMEZONE } from "@/lib/constants";
import { getPrisma } from "@/lib/db/client";
import type { OrgId } from "@/lib/db/types";
import { getDb } from "@/lib/db/with-org";
import { daysAgo } from "@/lib/utils";

const DAY = 1;

export async function loadOrgTimezone(orgId: OrgId): Promise<string> {
  const org = await getPrisma().organization.findUnique({
    where: { id: orgId },
    select: { timezone: true },
  });
  return org?.timezone ?? DEFAULT_TIMEZONE;
}

export interface AnalyticsSummary {
  totalCalls: number;
  attendanceRate: number;
  conversionRate: number;
  avgHandleTimeMs: number;
  totalCostCents: number;
  latencyP50: number;
  latencyP95: number;
  prevTotalCalls: number;
  prevAttendanceRate: number;
  prevConversionRate: number;
  prevAvgHandleTimeMs: number;
  prevTotalCostCents: number;
  prevLatencyP95: number;
  deltaTotalCallsPct: number;
  deltaAttendancePts: number;
  deltaConversionPts: number;
  deltaAvgHandleTimeMs: number;
  deltaLatencyP95Ms: number;
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
  const periodMs = Date.now() - rangeStart.getTime();
  const prevStart = new Date(rangeStart.getTime() - periodMs);

  const callSelect = {
    status: true,
    outcome: true,
    durationMs: true,
    costCents: true,
  } as const;

  const [currentCalls, prevCalls, currentMetrics, prevMetrics] = await Promise.all([
    db.call.findMany({ where: { startedAt: { gte: rangeStart } }, select: callSelect }),
    db.call.findMany({
      where: { startedAt: { gte: prevStart, lt: rangeStart } },
      select: callSelect,
    }),
    db.callMetric.findMany({
      where: { leg: "END_TO_END", occurredAt: { gte: rangeStart } },
      select: { valueMs: true },
    }),
    db.callMetric.findMany({
      where: { leg: "END_TO_END", occurredAt: { gte: prevStart, lt: rangeStart } },
      select: { valueMs: true },
    }),
  ]);

  const current = computePeriodMetrics(
    currentCalls,
    currentMetrics.map((m) => m.valueMs),
  );
  const prev = computePeriodMetrics(
    prevCalls,
    prevMetrics.map((m) => m.valueMs),
  );

  return {
    ...current,
    prevTotalCalls: prev.totalCalls,
    prevAttendanceRate: prev.attendanceRate,
    prevConversionRate: prev.conversionRate,
    prevAvgHandleTimeMs: prev.avgHandleTimeMs,
    prevTotalCostCents: prev.totalCostCents,
    prevLatencyP95: prev.latencyP95,
    deltaTotalCallsPct: deltaPct(current.totalCalls, prev.totalCalls),
    deltaAttendancePts: deltaPoints(current.attendanceRate, prev.attendanceRate),
    deltaConversionPts: deltaPoints(current.conversionRate, prev.conversionRate),
    deltaAvgHandleTimeMs: Math.round(current.avgHandleTimeMs - prev.avgHandleTimeMs),
    deltaLatencyP95Ms: current.latencyP95 - prev.latencyP95,
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

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export async function loadHeatmap(
  orgId: OrgId,
  rangeStart: Date,
  timezone: string = DEFAULT_TIMEZONE,
): Promise<HeatmapCell[]> {
  const db = getDb(orgId);
  const calls = await db.call.findMany({
    where: { startedAt: { gte: rangeStart } },
    select: { startedAt: true },
  });

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    hour: "numeric",
    hour12: false,
  });

  const counts: Record<string, number> = {};
  for (const c of calls) {
    const parts = formatter.formatToParts(c.startedAt);
    const weekdayPart = parts.find((p) => p.type === "weekday")?.value ?? "Sun";
    const hourPart = parts.find((p) => p.type === "hour")?.value ?? "0";
    const wd = WEEKDAY_INDEX[weekdayPart] ?? 0;
    const h = Number(hourPart) % 24;
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
  attendanceRate: number;
  conversionRate: number;
  avgHandleTimeMs: number;
  totalCostCents: number;
  p95LatencyMs: number;
}

export async function loadAgentComparison(orgId: OrgId, rangeStart: Date): Promise<AgentRow[]> {
  const db = getDb(orgId);
  const [agents, metrics] = await Promise.all([
    db.agent.findMany({
      include: {
        calls: {
          where: { startedAt: { gte: rangeStart } },
          select: { status: true, outcome: true, durationMs: true, costCents: true },
        },
      },
    }),
    db.callMetric.findMany({
      where: {
        leg: "END_TO_END",
        occurredAt: { gte: rangeStart },
        call: { agentId: { not: null } },
      },
      select: { valueMs: true, call: { select: { agentId: true } } },
    }),
  ]);

  const latencyByAgent = new Map<string, number[]>();
  for (const m of metrics) {
    const agentId = m.call.agentId;
    if (!agentId) continue;
    const list = latencyByAgent.get(agentId) ?? [];
    list.push(m.valueMs);
    latencyByAgent.set(agentId, list);
  }

  return agents
    .map((a) => {
      const total = a.calls.length;
      const answered = a.calls.filter((c) => ANSWERED_STATUSES.includes(c.status)).length;
      const converted = a.calls.filter(
        (c) => c.outcome != null && CONVERTED_OUTCOMES.includes(c.outcome),
      ).length;
      const durSum = a.calls.reduce((sum, c) => sum + (c.durationMs ?? 0), 0);
      const costSum = a.calls.reduce((sum, c) => sum + (c.costCents ?? 0), 0);
      const samples = (latencyByAgent.get(a.id) ?? []).sort((x, y) => x - y);
      return {
        id: a.id,
        name: a.name,
        totalCalls: total,
        attendanceRate: total === 0 ? 0 : answered / total,
        conversionRate: total === 0 ? 0 : converted / total,
        avgHandleTimeMs: answered === 0 ? 0 : durSum / answered,
        totalCostCents: costSum,
        p95LatencyMs: quantile(samples, 0.95),
      };
    })
    .sort((a, b) => b.totalCalls - a.totalCalls);
}

export interface InProgressCall {
  id: string;
  callerE164: string;
  agentName: string | null;
  startedAt: Date;
  status: CallStatus;
}

const LIVE_STATUSES: CallStatus[] = ["RINGING", "IN_PROGRESS"];

export async function loadInProgressCalls(orgId: OrgId): Promise<InProgressCall[]> {
  const db = getDb(orgId);
  const calls = await db.call.findMany({
    where: { status: { in: LIVE_STATUSES } },
    orderBy: { startedAt: "desc" },
    select: {
      id: true,
      callerE164: true,
      startedAt: true,
      status: true,
      agent: { select: { name: true } },
    },
  });
  return calls.map((c) => ({
    id: c.id,
    callerE164: c.callerE164,
    agentName: c.agent?.name ?? null,
    startedAt: c.startedAt,
    status: c.status,
  }));
}

export interface RecentCall {
  id: string;
  callerE164: string;
  outcome: CallOutcome | null;
  status: CallStatus;
  direction: "INBOUND" | "OUTBOUND";
  startedAt: Date;
}

export async function loadRecentCalls(orgId: OrgId, limit = 5): Promise<RecentCall[]> {
  const db = getDb(orgId);
  const calls = await db.call.findMany({
    where: { startedAt: { gte: daysAgo(DAY) } },
    orderBy: { startedAt: "desc" },
    take: limit,
    select: {
      id: true,
      callerE164: true,
      outcome: true,
      status: true,
      direction: true,
      startedAt: true,
    },
  });
  return calls;
}

export interface OutcomeBreakdown {
  scheduled: number;
  qualified: number;
  transferred: number;
  noAnswer: number;
  notQualified: number;
  other: number;
  total: number;
}

export async function loadTodayOutcomes(orgId: OrgId): Promise<OutcomeBreakdown> {
  const db = getDb(orgId);
  const calls = await db.call.findMany({
    where: { startedAt: { gte: daysAgo(DAY) } },
    select: { outcome: true },
  });

  const breakdown: OutcomeBreakdown = {
    scheduled: 0,
    qualified: 0,
    transferred: 0,
    noAnswer: 0,
    notQualified: 0,
    other: 0,
    total: calls.length,
  };
  for (const c of calls) {
    switch (c.outcome) {
      case "SCHEDULED":
        breakdown.scheduled += 1;
        break;
      case "QUALIFIED":
        breakdown.qualified += 1;
        break;
      case "TRANSFERRED":
        breakdown.transferred += 1;
        break;
      case "NO_ANSWER":
        breakdown.noAnswer += 1;
        break;
      case "NOT_QUALIFIED":
        breakdown.notQualified += 1;
        break;
      default:
        breakdown.other += 1;
    }
  }
  return breakdown;
}

export interface ActiveAgents {
  enabled: number;
  withCallsToday: number;
}

export async function loadActiveAgents(orgId: OrgId): Promise<ActiveAgents> {
  const db = getDb(orgId);
  const [enabled, callerAgents] = await Promise.all([
    db.agent.count({ where: { enabled: true } }),
    db.call.findMany({
      where: { startedAt: { gte: daysAgo(DAY) }, agentId: { not: null } },
      select: { agentId: true },
      distinct: ["agentId"],
    }),
  ]);
  return { enabled, withCallsToday: callerAgents.length };
}
