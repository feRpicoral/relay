import { type NextRequest, NextResponse } from "next/server";

import { getPrisma } from "@/lib/db/client";
import { requireEnv } from "@/lib/env";
import { verifyTwilioSignature } from "@/lib/voice/twilio";

export const dynamic = "force-dynamic";

/**
 * Twilio status callback for inbound + outbound calls. We use the `completed`
 * and `no-answer` events to finalize Call rows when the worker can't see the
 * hangup (rare; mostly a safety net).
 */
export async function POST(request: NextRequest) {
  const url = `${requireEnv("NEXT_PUBLIC_APP_URL")}/api/webhooks/twilio/status`;
  const form = await request.formData();
  const params: Record<string, string> = {};
  for (const [k, v] of form.entries()) {
    params[k] = typeof v === "string" ? v : "";
  }
  if (!verifyTwilioSignature(request.headers.get("x-twilio-signature"), url, params)) {
    return new Response("invalid signature", { status: 403 });
  }

  const callSid = params.CallSid;
  const status = params.CallStatus;
  if (!callSid) return NextResponse.json({ ok: true });

  const call = await getPrisma().call.findUnique({ where: { twilioCallSid: callSid } });
  if (!call) return NextResponse.json({ ok: true });

  if (
    status === "completed" ||
    status === "failed" ||
    status === "no-answer" ||
    status === "busy"
  ) {
    const endedAt = new Date();
    const durationMs = call.startedAt ? endedAt.getTime() - call.startedAt.getTime() : undefined;
    await getPrisma().call.update({
      where: { id: call.id },
      data: {
        status:
          status === "no-answer"
            ? "NO_ANSWER"
            : status === "failed" || status === "busy"
              ? "FAILED"
              : "COMPLETED",
        endedAt,
        durationMs,
      },
    });
  }

  return NextResponse.json({ ok: true });
}
