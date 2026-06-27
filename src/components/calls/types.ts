import type { CallDirection, CallOutcome, CallStatus, Sentiment } from "@prisma/client";

export interface CallListRow {
  id: string;
  status: CallStatus;
  direction: CallDirection;
  peerPhone: string;
  callerName: string | null;
  agentName: string | null;
  startedAt: string;
  durationMs: number | null;
  sentiment: Sentiment | null;
  outcome: CallOutcome | null;
}
