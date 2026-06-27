import type { CallDirection, CallOutcome, CallStatus, Sentiment } from "@prisma/client";

import { toCsv } from "@/lib/csv";
import { currency, formatDuration } from "@/lib/utils";

export interface CallExportRow {
  startedAt: Date;
  direction: CallDirection;
  status: CallStatus;
  callerE164: string;
  calleeE164: string;
  callerName: string | null;
  agentName: string | null;
  durationMs: number | null;
  outcome: CallOutcome | null;
  sentiment: Sentiment | null;
  costCents: number | null;
}

export const CALL_EXPORT_HEADERS = [
  "Started",
  "Direction",
  "Status",
  "Caller",
  "Callee",
  "Name",
  "Agent",
  "Duration",
  "Outcome",
  "Sentiment",
  "Cost (USD)",
] as const;

function callExportCells(row: CallExportRow): string[] {
  return [
    row.startedAt.toISOString(),
    row.direction,
    row.status,
    row.callerE164,
    row.calleeE164,
    row.callerName ?? "",
    row.agentName ?? "",
    row.durationMs != null ? formatDuration(row.durationMs) : "",
    row.outcome ?? "",
    row.sentiment ?? "",
    row.costCents != null ? currency(row.costCents, "USD") : "",
  ];
}

/** Maps call rows to an RFC 4180 CSV document with a header line. */
export function callsToCsv(rows: CallExportRow[]): string {
  return toCsv([[...CALL_EXPORT_HEADERS], ...rows.map(callExportCells)]);
}
