import "server-only";

import { ListUpdate } from "@livekit/protocol";
import { SipClient } from "livekit-server-sdk";

import { ORG_NAME_PREFIX_LEN, SIP_TRANSPORT_UDP } from "@/lib/constants";
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
  // LiveKit's address is a bare hostname, NOT a SIP URI. Common gotchas:
  // adding `sip:` returns "trunk address should be a hostname or IP, not SIP
  // URI"; adding `;transport=tls` returns "trunk address should not contain
  // transport parameter". Transport is controlled via the `transport` opt only.
  //
  // Default to UDP because Twilio Elastic SIP Trunks ship with UDP on 5060
  // and require explicit setup for TLS. UDP works against any new Twilio
  // trunk out of the box.
  const trunk = await client().createSipOutboundTrunk(
    `relay-org-${args.orgId.slice(0, ORG_NAME_PREFIX_LEN)}`,
    args.twilioDomain,
    args.numbers,
    {
      authUsername: args.authUsername,
      authPassword: args.authPassword,
      transport: SIP_TRANSPORT_UDP,
    },
  );
  return trunk.sipTrunkId;
}

export async function deleteOutboundTrunk(trunkId: string): Promise<void> {
  await client().deleteSipTrunk(trunkId);
}
