import "server-only";

import { AccessToken, RoomServiceClient } from "livekit-server-sdk";

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
    // already gone — fine.
  });
}

export function buildRoomName(callId: string): string {
  return `call-${callId}`;
}
