import { type NextRequest, NextResponse } from "next/server";

import { requireEnv } from "@/lib/env";
import { resolvePhoneNumber } from "@/lib/voice/agent-context";
import { buildRoomName, createRoom } from "@/lib/voice/livekit";
import { createInboundCall } from "@/lib/voice/persistence";
import { generateInboundTwiML, verifyTwilioSignature } from "@/lib/voice/twilio";

export const dynamic = "force-dynamic";

/**
 * Twilio webhook hit when an inbound PSTN call arrives at one of our numbers.
 * We resolve the tenant + agent from `To`, create a Call row, ensure a LiveKit
 * room exists, and return TwiML that bridges Twilio into LiveKit via SIP.
 */
export async function POST(request: NextRequest) {
  const url = `${requireEnv("NEXT_PUBLIC_APP_URL")}/api/webhooks/twilio/voice`;
  const form = await request.formData();
  const params: Record<string, string> = {};
  for (const [k, v] of form.entries()) {
    params[k] = typeof v === "string" ? v : "";
  }
  const signature = request.headers.get("x-twilio-signature");
  if (!verifyTwilioSignature(signature, url, params)) {
    return new Response("invalid signature", { status: 403 });
  }

  const from = params.From ?? "";
  const to = params.To ?? "";
  const callSid = params.CallSid ?? "";

  const phoneNumber = await resolvePhoneNumber(to);
  if (!phoneNumber || !phoneNumber.agentId) {
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Say>This number is not configured.</Say><Hangup/></Response>`,
      { status: 200, headers: { "content-type": "application/xml" } },
    );
  }

  const { callId } = await createInboundCall({
    orgId: phoneNumber.orgId,
    agentId: phoneNumber.agentId,
    phoneNumberId: phoneNumber.id,
    callerE164: from,
    calleeE164: to,
    twilioCallSid: callSid,
  });

  const roomName = buildRoomName(callId);
  await createRoom(roomName, {
    callId,
    orgId: phoneNumber.orgId,
    agentId: phoneNumber.agentId,
  });

  // Notify the worker to spin up an agent session in this room.
  fetch(`${requireEnv("WORKER_PUBLIC_URL")}/dispatch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.WORKER_SHARED_SECRET ?? ""}`,
    },
    body: JSON.stringify({ callId, roomName }),
  }).catch((err) => {
    console.warn("[twilio webhook] failed to dispatch worker:", err);
  });

  return new NextResponse(generateInboundTwiML(roomName), {
    status: 200,
    headers: { "content-type": "application/xml" },
  });
}
