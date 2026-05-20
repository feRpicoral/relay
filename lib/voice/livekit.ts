import "server-only";

import { AccessToken, RoomServiceClient, SipClient } from "livekit-server-sdk";

import { optionalEnv, requireEnv } from "@/lib/env";

function lkUrl(): string {
  // RoomServiceClient wants https/http, not wss.
  const wsUrl = requireEnv("LIVEKIT_URL");
  return wsUrl.replace(/^wss:/, "https:").replace(/^ws:/, "http:");
}

export function getRoomService(): RoomServiceClient {
  return new RoomServiceClient(
    lkUrl(),
    requireEnv("LIVEKIT_API_KEY"),
    requireEnv("LIVEKIT_API_SECRET"),
  );
}

export interface IssueParticipantTokenInput {
  roomName: string;
  identity: string;
  name?: string;
  metadata?: string;
  canPublish?: boolean;
  canSubscribe?: boolean;
  ttlSeconds?: number;
}

export async function issueParticipantToken(input: IssueParticipantTokenInput): Promise<string> {
  const at = new AccessToken(requireEnv("LIVEKIT_API_KEY"), requireEnv("LIVEKIT_API_SECRET"), {
    identity: input.identity,
    name: input.name,
    metadata: input.metadata,
    ttl: input.ttlSeconds ?? 3600,
  });
  at.addGrant({
    room: input.roomName,
    roomJoin: true,
    canPublish: input.canPublish ?? false,
    canSubscribe: input.canSubscribe ?? true,
  });
  return at.toJwt();
}

export async function createRoom(roomName: string, metadata?: Record<string, unknown>) {
  const svc = getRoomService();
  return svc.createRoom({
    name: roomName,
    emptyTimeout: 30,
    maxParticipants: 4,
    metadata: metadata ? JSON.stringify(metadata) : undefined,
  });
}

export async function deleteRoom(roomName: string) {
  const svc = getRoomService();
  await svc.deleteRoom(roomName).catch(() => {
    // already gone — fine.
  });
}

export function buildRoomName(callId: string): string {
  return `call-${callId}`;
}

export function getSipClient(): SipClient {
  return new SipClient(lkUrl(), requireEnv("LIVEKIT_API_KEY"), requireEnv("LIVEKIT_API_SECRET"));
}

/**
 * Originate an outbound SIP call. LiveKit dials the destination via the
 * configured outbound trunk (typically a Twilio Elastic SIP trunk) and joins
 * the resulting participant to the given room. The agent worker dispatched to
 * the same room will then drive the conversation.
 */
export async function placeOutboundSipCall(args: {
  roomName: string;
  toE164: string;
  participantIdentity: string;
  participantName?: string;
}): Promise<void> {
  const trunkId = optionalEnv("LIVEKIT_SIP_OUTBOUND_TRUNK_ID");
  if (!trunkId) {
    throw new Error(
      "LIVEKIT_SIP_OUTBOUND_TRUNK_ID is not set; configure an outbound SIP trunk in LiveKit before running outbound campaigns.",
    );
  }
  const sip = getSipClient();
  await sip.createSipParticipant(trunkId, args.toE164, args.roomName, {
    participantIdentity: args.participantIdentity,
    participantName: args.participantName ?? args.toE164,
    waitUntilAnswered: false,
  });
}
