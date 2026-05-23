import { WebhookReceiver } from "livekit-server-sdk";
import { type NextRequest, NextResponse } from "next/server";

import { getPrisma } from "@/lib/db/client";
import { asCallId, asOrgId } from "@/lib/db/types";
import { requireEnv } from "@/lib/env";
import { parseCallIdFromRoomName } from "@/lib/voice/livekit";
import { recordCallEvent } from "@/lib/voice/persistence";

export const dynamic = "force-dynamic";

/**
 * LiveKit webhook handler. Observability + crash-recovery: the worker drives
 * the call lifecycle, but if it dies mid-call we want to finalize the row from
 * here. Idempotency is enforced via `updateMany` with a status filter so
 * LiveKit's retry storms can't double-update.
 */
export async function POST(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (!auth) {
    return new Response("missing authorization", { status: 401 });
  }

  const receiver = new WebhookReceiver(
    requireEnv("LIVEKIT_API_KEY"),
    requireEnv("LIVEKIT_API_SECRET"),
  );
  const body = await request.text();
  let event;
  try {
    event = await receiver.receive(body, auth);
  } catch (err) {
    // Signature mismatch is security-relevant: log so it shows up if someone
    // is actually probing the endpoint.
    console.warn("[livekit webhook] signature verification failed", err);
    return new Response("invalid", { status: 401 });
  }

  const callId = parseCallIdFromRoomName(event.room?.name);
  if (!callId) {
    // Not one of ours (e.g. ad-hoc rooms): ack so LiveKit doesn't retry.
    return NextResponse.json({ ok: true });
  }

  try {
    const call = await getPrisma().call.findUnique({ where: { id: callId } });
    if (!call) return NextResponse.json({ ok: true });

    const orgId = asOrgId(call.orgId);
    const callIdBranded = asCallId(callId);

    // LiveKit attaches a delivery id; reuse it as the CallEvent externalId so
    // retries (5xx → LiveKit re-fires) are deduplicated by the DB.
    const externalId = event.id ? `livekit:${event.id}` : undefined;

    switch (event.event) {
      case "participant_joined":
        await recordCallEvent(
          orgId,
          callIdBranded,
          "PARTICIPANT_JOINED",
          { identity: event.participant?.identity },
          externalId,
        );
        break;
      case "participant_left":
        await recordCallEvent(
          orgId,
          callIdBranded,
          "PARTICIPANT_LEFT",
          { identity: event.participant?.identity },
          externalId,
        );
        break;
      case "room_finished": {
        // Idempotent finalize: only the first webhook to win the status race
        // updates. Subsequent redeliveries change zero rows and silently exit.
        const endedAt = new Date();
        const durationMs = call.startedAt ? endedAt.getTime() - call.startedAt.getTime() : null;
        await getPrisma().call.updateMany({
          where: { id: callId, status: { notIn: ["COMPLETED", "FAILED"] } },
          data: { status: "COMPLETED", endedAt, durationMs },
        });
        break;
      }
      case "egress_ended":
        // Recording pipeline not implemented yet; ack to suppress retries.
        break;
      default:
        // Unknown event: log so we notice new event types instead of dropping.
        console.warn("[livekit webhook] unhandled event", event.event);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    // Returning 5xx makes LiveKit retry. For DB-down conditions that's the
    // right behavior; we re-throw so Next.js surfaces a 500 to LiveKit.
    console.error("[livekit webhook] processing failed", err);
    throw err;
  }
}
