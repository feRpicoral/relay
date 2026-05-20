import "server-only";

import twilio from "twilio";

import { requireEnv } from "@/lib/env";

let cached: ReturnType<typeof twilio> | null = null;

export function getTwilioClient() {
  if (!cached) {
    cached = twilio(requireEnv("TWILIO_ACCOUNT_SID"), requireEnv("TWILIO_AUTH_TOKEN"));
  }
  return cached;
}

/**
 * Generate TwiML that bridges an inbound PSTN call into our LiveKit SIP trunk.
 * The trunk is configured to route incoming SIP to the appropriate LiveKit room.
 */
export function generateInboundTwiML(roomName: string): string {
  const sipDomain = requireEnv("TWILIO_SIP_DOMAIN");
  // The SIP URI tells the SIP provider which LiveKit room to drop the call into.
  // The room name is encoded into the SIP URI so the LiveKit SIP service can route it.
  const sipUri = `sip:${roomName}@${sipDomain}`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial answerOnBridge="true" timeLimit="3600">
    <Sip>${sipUri}</Sip>
  </Dial>
</Response>`;
}

export function verifyTwilioSignature(
  signature: string | null,
  url: string,
  params: Record<string, string>,
): boolean {
  if (!signature) return false;
  return twilio.validateRequest(requireEnv("TWILIO_AUTH_TOKEN"), signature, url, params);
}

export async function createOutboundCall(input: {
  to: string;
  from: string;
  twimlUrl: string;
  amdEnabled?: boolean;
  statusCallbackUrl?: string;
}) {
  const client = getTwilioClient();
  return client.calls.create({
    to: input.to,
    from: input.from,
    url: input.twimlUrl,
    machineDetection: input.amdEnabled ? "DetectMessageEnd" : undefined,
    statusCallback: input.statusCallbackUrl,
    statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
    statusCallbackMethod: "POST",
  });
}
