import { AccessToken, RoomServiceClient, SipClient } from "livekit-server-sdk";

import { requireEnv } from "@/lib/env";

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
    // already gone, fine.
  });
}

/** Room name convention shared by worker, webhook handler, and test-call. */
const ROOM_PREFIX = "call-";

export function buildRoomName(callId: string): string {
  return `${ROOM_PREFIX}${callId}`;
}

/** Returns the callId encoded in a Relay-managed room name, or null. */
export function parseCallIdFromRoomName(roomName: string | null | undefined): string | null {
  if (!roomName || !roomName.startsWith(ROOM_PREFIX)) return null;
  return roomName.slice(ROOM_PREFIX.length);
}

export function getSipClient(): SipClient {
  return new SipClient(lkUrl(), requireEnv("LIVEKIT_API_KEY"), requireEnv("LIVEKIT_API_SECRET"));
}

/**
 * Originate an outbound SIP call. LiveKit dials the destination via the
 * outbound trunk passed in (per-org Twilio trunk provisioned through the
 * settings UI). The agent worker dispatched to the same room will drive the
 * conversation. Caller is responsible for resolving the org's trunk id (see
 * `lib/telephony/connection.ts` and `lib/inngest/functions/campaign-dispatch.ts`).
 */
export async function placeOutboundSipCall(args: {
  trunkId: string;
  roomName: string;
  toE164: string;
  participantIdentity: string;
  participantName?: string;
}): Promise<void> {
  if (!args.trunkId) {
    throw new Error(
      "Outbound trunk id missing. Connect Twilio in Settings → Telefonia so Relay can provision a per-org trunk before outbound calls.",
    );
  }
  const sip = getSipClient();
  await sip.createSipParticipant(args.trunkId, args.toE164, args.roomName, {
    participantIdentity: args.participantIdentity,
    participantName: args.participantName ?? args.toE164,
    waitUntilAnswered: false,
  });
}
