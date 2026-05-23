import "server-only";

import { randomUUID } from "node:crypto";

import { type AgentId, asPhoneNumberId, type OrgId } from "@/lib/db/types";
import { getDb } from "@/lib/db/with-org";
import { requireEnv } from "@/lib/env";
import { buildRoomName, createRoom, issueParticipantToken } from "@/lib/voice/livekit";
import { createInboundCall } from "@/lib/voice/persistence";

/**
 * Synthetic "from" number used for in-dashboard test calls. Not a real E.164.
 * `Call.callerE164` is required by the schema; UI filters on this prefix to
 * distinguish test calls from real ones.
 */
export const TEST_CALL_PLACEHOLDER_E164 = "+0000000TEST";

/**
 * Create a test call for the in-dashboard simulated call feature.
 *
 * Creates a Call row + LiveKit room, returns a participant token the browser
 * uses to join and publish microphone audio. The agent worker auto-dispatches
 * to the new room (the framework subscribes to room-created events) and reads
 * the call/org IDs from the room metadata.
 */
export async function startTestCall(args: {
  orgId: OrgId;
  agentId: AgentId;
  testerEmail: string;
}): Promise<{ token: string; livekitUrl: string; callId: string; roomName: string }> {
  const db = getDb(args.orgId);
  // Org-scoped lookup: a forged agentId from another org simply returns null.
  const agent = await db.agent.findFirst({
    where: { id: args.agentId },
    select: { id: true },
  });
  if (!agent) throw new AgentNotFoundError();

  const phone = await db.phoneNumber.findFirst({
    where: { agentId: args.agentId },
  });

  // Pre-generate the Call id so we know the canonical room name up front and
  // can insert the Call row with `livekitRoomName` already populated — no
  // two-phase create+update.
  const callId = randomUUID();
  const roomName = buildRoomName(callId);

  await createInboundCall({
    id: callId,
    orgId: args.orgId,
    agentId: args.agentId,
    phoneNumberId: phone?.id ? asPhoneNumberId(phone.id) : null,
    callerE164: TEST_CALL_PLACEHOLDER_E164,
    calleeE164: phone?.e164 ?? TEST_CALL_PLACEHOLDER_E164,
    livekitRoomName: roomName,
  });

  await createRoom(roomName, {
    callId,
    orgId: args.orgId,
    agentId: args.agentId,
    test: true,
  });

  const token = await issueParticipantToken({
    roomName,
    identity: `tester-${args.testerEmail}`,
    canPublish: true,
    canSubscribe: true,
  });
  return { token, livekitUrl: requireEnv("LIVEKIT_URL"), callId, roomName };
}

export class AgentNotFoundError extends Error {
  constructor() {
    super("agent_not_found");
    this.name = "AgentNotFoundError";
  }
}
