import { getPrisma } from "@/lib/db/client";
import {
  type AgentId,
  asCallId,
  type CallId,
  type CampaignAttemptId,
  type OrgId,
  type PhoneNumberId,
} from "@/lib/db/types";
import { getDb } from "@/lib/db/with-org";

import type { LatencyMetric, ToolCallRecord, TranscriptDelta } from "./types";

interface CreateInboundCallInput {
  /**
   * Optional explicit row id. When set, `livekitRoomName` can be precomputed
   * from `buildRoomName(id)`, avoiding a two-phase create-then-update.
   */
  id?: string;
  orgId: OrgId;
  agentId: AgentId;
  phoneNumberId: PhoneNumberId | null;
  callerE164: string;
  calleeE164: string;
  twilioCallSid?: string;
  livekitRoomName?: string;
}

export async function createInboundCall(input: CreateInboundCallInput): Promise<{
  callId: CallId;
  orgId: OrgId;
}> {
  const db = getDb(input.orgId);
  // `orgId` is required by Prisma's generated types even though the getDb
  // extension also injects it at runtime; we pass it explicitly so the
  // compile-time check still passes.
  const call = await db.call.create({
    data: {
      id: input.id,
      orgId: input.orgId,
      agentId: input.agentId,
      phoneNumberId: input.phoneNumberId,
      callerE164: input.callerE164,
      calleeE164: input.calleeE164,
      direction: "INBOUND",
      status: "RINGING",
      twilioCallSid: input.twilioCallSid,
      livekitRoomName: input.livekitRoomName,
    },
  });
  return { callId: asCallId(call.id), orgId: input.orgId };
}

interface CreateOutboundCallInput {
  orgId: OrgId;
  agentId: AgentId;
  callerE164: string;
  calleeE164: string;
  livekitRoomName?: string;
  campaignAttemptId?: CampaignAttemptId;
}

export async function createOutboundCall(input: CreateOutboundCallInput): Promise<{
  callId: CallId;
  orgId: OrgId;
}> {
  const db = getDb(input.orgId);
  const call = await db.call.create({
    data: {
      orgId: input.orgId,
      agentId: input.agentId,
      callerE164: input.callerE164,
      calleeE164: input.calleeE164,
      direction: "OUTBOUND",
      status: "RINGING",
      livekitRoomName: input.livekitRoomName,
    },
  });

  if (input.campaignAttemptId) {
    // Org-scoped via getDb; updateMany so a forged attemptId from another org
    // simply changes zero rows instead of cross-tenant updating.
    await db.campaignAttempt.updateMany({
      where: { id: input.campaignAttemptId },
      data: { callId: call.id },
    });
  }

  return { callId: asCallId(call.id), orgId: input.orgId };
}

export async function markCallAnswered(orgId: OrgId, callId: CallId): Promise<void> {
  const db = getDb(orgId);
  await db.call.updateMany({
    where: { id: callId },
    data: { status: "IN_PROGRESS", answeredAt: new Date() },
  });
}

export async function markCallEnded(
  orgId: OrgId,
  callId: CallId,
  args: {
    status?: "COMPLETED" | "FAILED" | "NO_ANSWER" | "VOICEMAIL";
    durationMs?: number;
    recordingUrl?: string;
    costCents?: number;
  } = {},
): Promise<void> {
  const db = getDb(orgId);
  const endedAt = new Date();
  await db.call.updateMany({
    where: { id: callId },
    data: {
      status: args.status ?? "COMPLETED",
      endedAt,
      durationMs: args.durationMs,
      recordingUrl: args.recordingUrl,
      costCents: args.costCents,
    },
  });
}

export async function appendTranscript(
  orgId: OrgId,
  callId: string,
  delta: TranscriptDelta,
): Promise<void> {
  const db = getDb(orgId);
  await db.transcript.create({
    data: {
      orgId,
      callId,
      speaker: delta.speaker,
      text: delta.text,
      startMs: delta.startMs,
      endMs: delta.endMs,
      isFinal: delta.isFinal,
      confidence: delta.confidence,
    },
  });
}

export async function recordToolCall(
  orgId: OrgId,
  callId: string,
  rec: ToolCallRecord,
): Promise<void> {
  const db = getDb(orgId);
  await db.toolCall.create({
    data: {
      orgId,
      callId,
      name: rec.name,
      inputJson: rec.inputJson,
      outputJson: rec.outputJson,
      errorMessage: rec.errorMessage,
      startedAt: rec.startedAt,
      endedAt: rec.endedAt,
      durationMs: rec.durationMs,
    },
  });
}

export async function recordCallEvent(
  orgId: OrgId,
  callId: string,
  type:
    | "ROOM_CREATED"
    | "PARTICIPANT_JOINED"
    | "PARTICIPANT_LEFT"
    | "AGENT_SPOKE"
    | "USER_SPOKE"
    | "TOOL_INVOKED"
    | "TRANSFER_REQUESTED"
    | "RECORDING_STARTED"
    | "RECORDING_STOPPED"
    | "HANGUP"
    | "ERROR",
  payload?: Record<string, unknown>,
  /**
   * Idempotency key from an external delivery system (LiveKit webhooks). Same
   * key on a redelivery is dropped via the unique constraint on
   * `CallEvent.externalId`, so the timeline doesn't accumulate duplicates.
   */
  externalId?: string,
): Promise<void> {
  const db = getDb(orgId);
  try {
    await db.callEvent.create({
      data: { orgId, callId, type, payload, externalId },
    });
  } catch (err) {
    // P2002 on externalId is the expected "already seen" path — swallow it
    // because the row already exists. Anything else propagates.
    if (
      externalId &&
      err instanceof Error &&
      "code" in err &&
      (err as { code?: string }).code === "P2002"
    ) {
      return;
    }
    throw err;
  }
}

export async function recordLatency(
  orgId: OrgId,
  callId: string,
  metric: LatencyMetric,
): Promise<void> {
  const db = getDb(orgId);
  await db.callMetric.create({
    data: {
      orgId,
      callId,
      leg: metric.leg,
      valueMs: metric.valueMs,
      metadata: metric.metadata,
    },
  });
}

/**
 * Service-role lookup used only by the LiveKit webhook receiver to resolve
 * which tenant a room belongs to before falling back into org-scoped queries.
 */
export async function findCallById(callId: string): Promise<{ orgId: OrgId } | null> {
  const call = await getPrisma().call.findUnique({
    where: { id: callId },
    select: { orgId: true },
  });
  if (!call) return null;
  return { orgId: call.orgId as OrgId };
}
