import { getPrisma } from "@/lib/db/client";
import { asCallId, asOrgId, type CallId, type OrgId } from "@/lib/db/types";
import { getDb } from "@/lib/db/with-org";

import type { LatencyMetric, ToolCallRecord, TranscriptDelta } from "./types";

interface CreateInboundCallInput {
  orgId: string;
  agentId: string;
  phoneNumberId: string;
  callerE164: string;
  calleeE164: string;
  twilioCallSid?: string;
  livekitRoomName?: string;
}

export async function createInboundCall(input: CreateInboundCallInput): Promise<{
  callId: CallId;
  orgId: OrgId;
}> {
  const call = await getPrisma().call.create({
    data: {
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
  return { callId: asCallId(call.id), orgId: asOrgId(call.orgId) };
}

interface CreateOutboundCallInput {
  orgId: string;
  agentId: string;
  callerE164: string;
  calleeE164: string;
  livekitRoomName?: string;
  campaignAttemptId?: string;
}

export async function createOutboundCall(input: CreateOutboundCallInput): Promise<{
  callId: CallId;
  orgId: OrgId;
}> {
  const call = await getPrisma().call.create({
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
    await getPrisma().campaignAttempt.update({
      where: { id: input.campaignAttemptId },
      data: { callId: call.id },
    });
  }

  return { callId: asCallId(call.id), orgId: asOrgId(call.orgId) };
}

export async function markCallAnswered(callId: string): Promise<void> {
  await getPrisma().call.update({
    where: { id: callId },
    data: { status: "IN_PROGRESS", answeredAt: new Date() },
  });
}

export async function markCallEnded(
  callId: string,
  args: {
    status?: "COMPLETED" | "FAILED" | "NO_ANSWER" | "VOICEMAIL";
    durationMs?: number;
    recordingUrl?: string;
    costCents?: number;
  } = {},
): Promise<void> {
  const endedAt = new Date();
  await getPrisma().call.update({
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
): Promise<void> {
  const db = getDb(orgId);
  await db.callEvent.create({
    data: { orgId, callId, type, payload },
  });
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
