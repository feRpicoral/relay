import "server-only";

import { ListUpdate } from "@livekit/protocol";
import { SipClient } from "livekit-server-sdk";

import { requireEnv } from "@/lib/env";

let cachedClient: SipClient | null = null;
function client(): SipClient {
  if (!cachedClient) {
    cachedClient = new SipClient(
      requireEnv("LIVEKIT_URL").replace(/^wss?:\/\//, "https://"),
      requireEnv("LIVEKIT_API_KEY"),
      requireEnv("LIVEKIT_API_SECRET"),
    );
  }
  return cachedClient;
}

/**
 * Hostname that customer Twilio trunks should send inbound calls to. Derived
 * from LIVEKIT_URL (`wss://<project>.livekit.cloud` → `<project>.sip.livekit.cloud`).
 * Used as the SIP URL when configuring a customer's Twilio origination URL.
 */
export function getLivekitSipInboundHost(): string {
  const url = new URL(requireEnv("LIVEKIT_URL"));
  const project = url.hostname.split(".")[0];
  return `${project}.sip.livekit.cloud`;
}

/**
 * Add a phone number to the shared LiveKit inbound trunk's allow-list so calls
 * for it are accepted and routed to our worker. Idempotent.
 */
export async function addNumberToInboundAllowList(e164: string): Promise<void> {
  const trunkId = requireEnv("LIVEKIT_SIP_INBOUND_TRUNK_ID");
  await client().updateSipInboundTrunkFields(trunkId, {
    numbers: new ListUpdate({ add: [e164] }),
  });
}

export async function removeNumberFromInboundAllowList(e164: string): Promise<void> {
  const trunkId = requireEnv("LIVEKIT_SIP_INBOUND_TRUNK_ID");
  await client().updateSipInboundTrunkFields(trunkId, {
    numbers: new ListUpdate({ remove: [e164] }),
  });
}

/**
 * Create a per-org LiveKit outbound trunk. The trunk lives in our LiveKit
 * project but carries the customer's Twilio Termination URI as its address +
 * the customer's Twilio credential as auth. That way outbound calls billed
 * via this trunk hit the customer's Twilio account, not ours.
 */
export async function createOutboundTrunk(args: {
  orgId: string;
  twilioDomain: string;
  authUsername: string;
  authPassword: string;
  numbers: string[];
}): Promise<string> {
  const trunk = await client().createSipOutboundTrunk(
    `relay-org-${args.orgId.slice(0, 8)}`,
    `sip:${args.twilioDomain};transport=tls`,
    args.numbers,
    {
      authUsername: args.authUsername,
      authPassword: args.authPassword,
      transport: 3, // SIPTransport.SIP_TRANSPORT_TLS — secure outbound by default
    },
  );
  return trunk.sipTrunkId;
}

export async function deleteOutboundTrunk(trunkId: string): Promise<void> {
  await client().deleteSipTrunk(trunkId);
}
