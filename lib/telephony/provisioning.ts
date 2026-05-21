import "server-only";

import { randomBytes } from "node:crypto";

import { ORG_NAME_PREFIX_LEN } from "@/lib/constants";
import { getPrisma } from "@/lib/db/client";
import { type AgentId, asAgentId, type OrgId } from "@/lib/db/types";

import {
  addNumberToInboundAllowList,
  createOutboundTrunk,
  deleteOutboundTrunk,
  getLivekitSipInboundHost,
  removeNumberFromInboundAllowList,
} from "./livekit-trunks";
import { getTwilioClient } from "./twilio";

/**
 * Customer-facing view of a Twilio phone number the user owns. Lists what's
 * already wired into Relay (assignedAgentId, phoneNumberId from our DB) so the
 * UI can show "Connect" vs "Connected to <agent>".
 */
export interface AvailableNumber {
  twilioSid: string;
  e164: string;
  friendlyName: string;
  assignedAgentId: AgentId | null;
  phoneNumberId: string | null;
}

const RELAY_TRUNK_FRIENDLY_PREFIX = "relay-";

/**
 * Twilio's trunk `domain_name` is not auto-assigned on create — it stays null
 * unless you set it explicitly. We derive a deterministic, globally-unique
 * subdomain from the orgId so the same org always gets the same hostname even
 * if we recreate the trunk later. Format must match `[a-z0-9-]+.pstn.twilio.com`,
 * start and end alphanumeric, max 64 chars total.
 */
function deriveTrunkDomain(orgId: string): string {
  const slug = orgId.replace(/-/g, "").slice(0, 16).toLowerCase();
  return `relay-${slug}.pstn.twilio.com`;
}

/**
 * List the org's Twilio numbers and annotate each with our DB state.
 */
export async function listAvailableNumbers(orgId: OrgId): Promise<AvailableNumber[]> {
  const client = await getTwilioClient(orgId);
  const [numbers, attached] = await Promise.all([
    client.incomingPhoneNumbers.list({ limit: 200 }),
    getPrisma().phoneNumber.findMany({
      where: { orgId, twilioSid: { not: null } },
      select: { id: true, agentId: true, twilioSid: true },
    }),
  ]);
  const attachedBySid = new Map(attached.map((p) => [p.twilioSid!, p]));
  return numbers.map((n) => {
    const match = attachedBySid.get(n.sid);
    return {
      twilioSid: n.sid,
      e164: n.phoneNumber,
      friendlyName: n.friendlyName ?? n.phoneNumber,
      assignedAgentId: match?.agentId ? asAgentId(match.agentId) : null,
      phoneNumberId: match?.id ?? null,
    };
  });
}

/**
 * Idempotently ensure the org has a Twilio Elastic SIP Trunk + credential list
 * for outbound auth + origination URL pointing back at our LiveKit. Returns
 * everything callers need to wire a LiveKit outbound trunk.
 */
async function ensureTwilioTrunk(orgId: OrgId): Promise<{
  twilioTrunkSid: string;
  twilioDomain: string;
  credUsername: string;
  credPassword: string;
}> {
  const client = await getTwilioClient(orgId);
  const conn = await getPrisma().twilioConnection.findUniqueOrThrow({ where: { orgId } });

  let trunkSid = conn.twilioTrunkSid;
  let domainName: string | undefined = conn.twilioTrunkDomain ?? undefined;
  const desiredDomain = deriveTrunkDomain(orgId);

  if (trunkSid && !domainName) {
    // Re-fetch to see if Twilio has the domain set (e.g. user added it
    // manually in the Console). If still missing, patch it ourselves so the
    // trunk has a Termination URI we can hand to LiveKit.
    const existing = await client.trunking.v1.trunks(trunkSid).fetch();
    domainName = existing.domainName ?? undefined;
    if (!domainName) {
      const patched = await client.trunking.v1
        .trunks(trunkSid)
        .update({ domainName: desiredDomain });
      domainName = patched.domainName ?? desiredDomain;
    }
    await getPrisma().twilioConnection.update({
      where: { orgId },
      data: { twilioTrunkDomain: domainName },
    });
  }

  if (!trunkSid) {
    // Create with domainName explicit. Twilio leaves it null otherwise and
    // LiveKit later rejects with "no outbound address specified".
    const trunk = await client.trunking.v1.trunks.create({
      friendlyName: `${RELAY_TRUNK_FRIENDLY_PREFIX}${orgId.slice(0, ORG_NAME_PREFIX_LEN)}`,
      domainName: desiredDomain,
    });
    trunkSid = trunk.sid;
    domainName = trunk.domainName ?? desiredDomain;
    await getPrisma().twilioConnection.update({
      where: { orgId },
      data: { twilioTrunkSid: trunkSid, twilioTrunkDomain: domainName },
    });
  }

  if (!domainName) {
    throw new Error(`Twilio trunk ${trunkSid} ended up without a domain after patch attempts.`);
  }

  // Origination URL: where Twilio sends inbound PSTN calls. Point at our shared
  // LiveKit inbound SIP host. Idempotent — only adds if no matching URL exists.
  const livekitSipHost = getLivekitSipInboundHost();
  const expectedSipUrl = `sip:${livekitSipHost}`;
  const originationUrls = await client.trunking.v1.trunks(trunkSid).originationUrls.list();
  if (!originationUrls.some((u) => u.sipUrl === expectedSipUrl)) {
    await client.trunking.v1.trunks(trunkSid).originationUrls.create({
      friendlyName: "relay-livekit",
      sipUrl: expectedSipUrl,
      priority: 10,
      weight: 10,
      enabled: true,
    });
  }

  // Credential list: outbound auth (LiveKit → Twilio). Generate fresh creds
  // every time we provision; old creds linger on the trunk harmlessly. This
  // avoids needing another DB column to persist credentials.
  const credUsername = `relay${randomBytes(6).toString("hex")}`;
  const credPassword = randomBytes(24).toString("base64url");
  const credList = await client.trunking.v1.trunks(trunkSid).credentialsLists.create({
    credentialListSid: await createCredentialList(client, credUsername, credPassword),
  });
  void credList;

  return { twilioTrunkSid: trunkSid, twilioDomain: domainName, credUsername, credPassword };
}

async function createCredentialList(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any,
  username: string,
  password: string,
): Promise<string> {
  const list = await client.sip.credentialLists.create({
    friendlyName: `relay-cred-${Date.now()}`,
  });
  await client.sip.credentialLists(list.sid).credentials.create({ username, password });
  return list.sid;
}

/**
 * Idempotently ensure the org has a LiveKit outbound trunk wired to their
 * Twilio. Recreates if creds drifted (no way to introspect cred match without
 * test-dialing, so we recreate on every miss).
 */
async function ensureLivekitOutboundTrunk(orgId: OrgId, numbers: string[]): Promise<string> {
  const conn = await getPrisma().twilioConnection.findUniqueOrThrow({ where: { orgId } });
  if (conn.livekitOutboundTrunkId) {
    return conn.livekitOutboundTrunkId;
  }
  const { twilioDomain, credUsername, credPassword } = await ensureTwilioTrunk(orgId);
  const trunkId = await createOutboundTrunk({
    orgId,
    twilioDomain,
    authUsername: credUsername,
    authPassword: credPassword,
    numbers,
  });
  await getPrisma().twilioConnection.update({
    where: { orgId },
    data: { livekitOutboundTrunkId: trunkId },
  });
  return trunkId;
}

export interface AttachNumberInput {
  orgId: OrgId;
  twilioSid: string;
  agentId: AgentId;
  label?: string;
}

/**
 * Wire a Twilio number to a Relay agent end-to-end:
 *   1. Assign the number to the org's Twilio trunk (creating the trunk if first attach)
 *   2. Add the E.164 to our LiveKit inbound trunk allow-list
 *   3. Ensure the org has a LiveKit outbound trunk
 *   4. Persist the PhoneNumber row
 */
export async function attachNumber(input: AttachNumberInput): Promise<{ phoneNumberId: string }> {
  const client = await getTwilioClient(input.orgId);
  const phone = await client.incomingPhoneNumbers(input.twilioSid).fetch();

  const { twilioTrunkSid } = await ensureTwilioTrunk(input.orgId);
  await client.incomingPhoneNumbers(input.twilioSid).update({ trunkSid: twilioTrunkSid });

  await addNumberToInboundAllowList(phone.phoneNumber);

  await ensureLivekitOutboundTrunk(input.orgId, [phone.phoneNumber]);

  const row = await getPrisma().phoneNumber.create({
    data: {
      orgId: input.orgId,
      agentId: input.agentId,
      e164: phone.phoneNumber,
      label: input.label ?? phone.friendlyName ?? null,
      twilioSid: phone.sid,
      twilioTrunkSid,
    },
  });
  return { phoneNumberId: row.id };
}

/**
 * Reverse of attachNumber. Removes the number from the trunk on both Twilio
 * and LiveKit sides, then deletes the PhoneNumber row.
 */
export async function detachNumber(orgId: OrgId, phoneNumberId: string): Promise<void> {
  const number = await getPrisma().phoneNumber.findUniqueOrThrow({ where: { id: phoneNumberId } });
  if (number.orgId !== orgId) throw new Error("Cross-tenant detach attempt.");

  if (number.twilioSid) {
    const client = await getTwilioClient(orgId);
    // Setting trunkSid to empty string releases the number from the trunk.
    await client
      .incomingPhoneNumbers(number.twilioSid)
      .update({ trunkSid: "" })
      .catch(() => undefined);
  }

  await removeNumberFromInboundAllowList(number.e164).catch(() => undefined);

  await getPrisma().phoneNumber.delete({ where: { id: phoneNumberId } });
}

/**
 * Detach every number tied to this org and tear down the per-org LiveKit
 * outbound trunk. Caller (the disconnect server action) is then free to drop
 * the TwilioConnection row.
 */
export async function fullCleanup(orgId: OrgId): Promise<void> {
  const numbers = await getPrisma().phoneNumber.findMany({
    where: { orgId, twilioSid: { not: null } },
  });
  for (const n of numbers) {
    await detachNumber(orgId, n.id);
  }
  const conn = await getPrisma().twilioConnection.findUnique({ where: { orgId } });
  if (conn?.livekitOutboundTrunkId) {
    await deleteOutboundTrunk(conn.livekitOutboundTrunkId).catch(() => undefined);
  }
}
