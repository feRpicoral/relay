import "server-only";

import { getPrisma } from "@/lib/db/client";
import { type AgentId, asAgentId, asOrgId, type OrgId } from "@/lib/db/types";
import { requireEnv } from "@/lib/env";
import { buildRoomName, createRoom, issueParticipantToken } from "@/lib/voice/livekit";
import { createInboundCall } from "@/lib/voice/persistence";
// Note: previously created a "+TEST-..." phone row for orgs without a real
// phone. Replaced by passing phoneNumberId=null below.

/**
 * Create a "test call" for the in-dashboard simulated call feature.
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
  const agent = await getPrisma().agent.findUnique({ where: { id: args.agentId } });
  if (!agent) throw new Error("Agent not found.");
  if (agent.orgId !== args.orgId) throw new Error("Cross-tenant agent reference.");

  const phone = await getPrisma().phoneNumber.findFirst({
    where: { orgId: args.orgId, agentId: args.agentId },
  });

  // Don't create a synthetic "+TEST-..." PhoneNumber row when none exists.
  // The dashboard's phone-numbers list would surface it. PhoneNumber.id is
  // nullable on Call, so null is fine.
  const { callId } = await createInboundCall({
    orgId: args.orgId,
    agentId: args.agentId,
    phoneNumberId: phone?.id ?? null,
    callerE164: "+0000000TEST",
    calleeE164: phone?.e164 ?? "+0000000TEST",
  });

  const roomName = buildRoomName(callId);
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

export const _internal = { asOrgId, asAgentId };
