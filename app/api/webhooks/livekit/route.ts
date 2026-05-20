import { WebhookReceiver } from "livekit-server-sdk";
import { type NextRequest, NextResponse } from "next/server";

import { getPrisma } from "@/lib/db/client";
import { asCallId, asOrgId } from "@/lib/db/types";
import { requireEnv } from "@/lib/env";
import { recordCallEvent } from "@/lib/voice/persistence";

export const dynamic = "force-dynamic";

/**
 * LiveKit webhook events. We mostly observe, the worker handles its own
 * lifecycle. Events here are useful for debugging and for cases where the
 * worker process crashed and we need to finalize the Call row.
 */
export async function POST(request: NextRequest) {
  const receiver = new WebhookReceiver(
    requireEnv("LIVEKIT_API_KEY"),
    requireEnv("LIVEKIT_API_SECRET"),
  );
  const body = await request.text();
  const auth = request.headers.get("authorization") ?? "";
  let event;
  try {
    event = await receiver.receive(body, auth);
  } catch (err) {
    console.warn("[livekit webhook] invalid:", err);
    return new Response("invalid", { status: 401 });
  }

  const roomName = event.room?.name;
  if (!roomName || !roomName.startsWith("call-")) {
    return NextResponse.json({ ok: true });
  }
  const callId = roomName.replace(/^call-/, "");

  const call = await getPrisma().call.findUnique({ where: { id: callId } });
  if (!call) return NextResponse.json({ ok: true });

  const orgId = asOrgId(call.orgId);
  const callIdBranded = asCallId(callId);

  switch (event.event) {
    case "participant_joined":
      await recordCallEvent(orgId, callIdBranded, "PARTICIPANT_JOINED", {
        identity: event.participant?.identity,
      });
      break;
    case "participant_left":
      await recordCallEvent(orgId, callIdBranded, "PARTICIPANT_LEFT", {
        identity: event.participant?.identity,
      });
      break;
    case "room_finished":
      if (call.status !== "COMPLETED" && call.status !== "FAILED") {
        const endedAt = new Date();
        await getPrisma().call.update({
          where: { id: callId },
          data: {
            status: "COMPLETED",
            endedAt,
            durationMs: call.startedAt ? endedAt.getTime() - call.startedAt.getTime() : null,
          },
        });
      }
      break;
    case "egress_ended":
      // Recording handled in Phase 6 (post-call pipeline).
      break;
  }

  return NextResponse.json({ ok: true });
}
