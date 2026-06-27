import type { CallDirection, CallOutcome, CallStatus, Sentiment } from "@prisma/client";

import type { OrgId } from "@/lib/db/types";
import { getDb } from "@/lib/db/with-org";
import { formatPhone } from "@/lib/utils";

import type { CallExportRow } from "./export";
import { buildCallWhere, type CallFilters } from "./filters";

const LIST_SELECT = {
  id: true,
  status: true,
  direction: true,
  callerE164: true,
  calleeE164: true,
  startedAt: true,
  durationMs: true,
  sentiment: true,
  outcome: true,
  costCents: true,
  agent: { select: { name: true } },
  campaignAttempt: { select: { lead: { select: { name: true } } } },
} as const;

type ListCall = {
  id: string;
  status: CallStatus;
  direction: CallDirection;
  callerE164: string;
  calleeE164: string;
  startedAt: Date;
  durationMs: number | null;
  sentiment: Sentiment | null;
  outcome: CallOutcome | null;
  costCents: number | null;
  agent: { name: string } | null;
  campaignAttempt: { lead: { name: string | null } } | null;
};

export interface CallListItem {
  id: string;
  status: CallStatus;
  direction: CallDirection;
  peerPhone: string;
  callerName: string | null;
  agentName: string | null;
  startedAt: Date;
  durationMs: number | null;
  sentiment: Sentiment | null;
  outcome: CallOutcome | null;
}

function peerPhone(call: Pick<ListCall, "direction" | "callerE164" | "calleeE164">): string {
  return formatPhone(call.direction === "INBOUND" ? call.callerE164 : call.calleeE164);
}

function toListItem(call: ListCall): CallListItem {
  return {
    id: call.id,
    status: call.status,
    direction: call.direction,
    peerPhone: peerPhone(call),
    callerName: call.campaignAttempt?.lead.name ?? null,
    agentName: call.agent?.name ?? null,
    startedAt: call.startedAt,
    durationMs: call.durationMs,
    sentiment: call.sentiment,
    outcome: call.outcome,
  };
}

export async function loadCallsPage(
  orgId: OrgId,
  filters: CallFilters,
  page: number,
  pageSize: number,
): Promise<{ items: CallListItem[]; total: number }> {
  const db = getDb(orgId);
  const where = buildCallWhere(filters);
  const [total, calls] = await Promise.all([
    db.call.count({ where }),
    db.call.findMany({
      where,
      orderBy: { startedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: LIST_SELECT,
    }),
  ]);
  return { items: calls.map(toListItem), total };
}

export async function loadCallsForExport(
  orgId: OrgId,
  filters: CallFilters,
  limit: number,
): Promise<CallExportRow[]> {
  const db = getDb(orgId);
  const calls = await db.call.findMany({
    where: buildCallWhere(filters),
    orderBy: { startedAt: "desc" },
    take: limit,
    select: LIST_SELECT,
  });
  return calls.map((call) => ({
    startedAt: call.startedAt,
    direction: call.direction,
    status: call.status,
    callerE164: call.callerE164,
    calleeE164: call.calleeE164,
    callerName: call.campaignAttempt?.lead.name ?? null,
    agentName: call.agent?.name ?? null,
    durationMs: call.durationMs,
    outcome: call.outcome,
    sentiment: call.sentiment,
    costCents: call.costCents,
  }));
}
