import "server-only";

import { encryptSecret } from "@/lib/crypto";
import { getPrisma } from "@/lib/db/client";
import type { OrgId } from "@/lib/db/types";

import { buildTwilioClient } from "./twilio";

export interface TwilioCredentials {
  accountSid: string;
  apiKeySid: string;
  apiKeySecret: string;
}

export interface ConnectionStatus {
  connected: boolean;
  accountSid: string | null;
  accountName: string | null;
  twilioTrunkSid: string | null;
  livekitOutboundTrunkId: string | null;
}

export async function getConnectionStatus(orgId: OrgId): Promise<ConnectionStatus> {
  const conn = await getPrisma().twilioConnection.findUnique({ where: { orgId } });
  if (!conn) {
    return {
      connected: false,
      accountSid: null,
      accountName: null,
      twilioTrunkSid: null,
      livekitOutboundTrunkId: null,
    };
  }
  return {
    connected: true,
    accountSid: conn.accountSid,
    accountName: conn.accountName,
    twilioTrunkSid: conn.twilioTrunkSid,
    livekitOutboundTrunkId: conn.livekitOutboundTrunkId,
  };
}

/**
 * Validate the supplied credentials by listing phone numbers on the account,
 * then persist them encrypted. Replaces any existing connection (one per org).
 *
 * Note on endpoint choice: a Standard API key (the type the form asks for) is
 * rejected with 20003 against `/2010-04-01/Accounts/{sid}.json` because that
 * resource requires a Main API key. `incomingPhoneNumbers.list` is the
 * cheapest endpoint a Standard key can hit, and it exercises both the
 * credential and the binding to the right Account SID.
 */
export async function connect(orgId: OrgId, creds: TwilioCredentials): Promise<void> {
  const client = buildTwilioClient(creds);
  await client.incomingPhoneNumbers.list({ limit: 1 });

  const accountName = await fetchAccountFriendlyName(client, creds.accountSid);

  const authTokenEncrypted = encryptSecret(creds.apiKeySecret);
  await getPrisma().twilioConnection.upsert({
    where: { orgId },
    create: {
      orgId,
      accountSid: creds.accountSid,
      accountName,
      apiKeySid: creds.apiKeySid,
      authTokenEncrypted,
    },
    update: {
      accountSid: creds.accountSid,
      accountName,
      apiKeySid: creds.apiKeySid,
      authTokenEncrypted,
      // Wipe provisioning state so the next attach starts clean against the
      // (possibly different) account.
      twilioTrunkSid: null,
      livekitOutboundTrunkId: null,
    },
  });
}

/**
 * Best-effort fetch of the account's friendly name, cached so Settings can show
 * it without a Twilio round-trip per page load. A Standard API key (the kind the
 * connect form asks for) is rejected against the Accounts resource with code
 * 20003, so failure is expected and non-fatal — we fall back to null and the UI
 * shows the Account SID instead.
 */
async function fetchAccountFriendlyName(
  client: ReturnType<typeof buildTwilioClient>,
  accountSid: string,
): Promise<string | null> {
  try {
    const account = await client.api.v2010.accounts(accountSid).fetch();
    return account.friendlyName ?? null;
  } catch {
    return null;
  }
}

/**
 * Drop the connection row. Does NOT tear down resources provisioned on the
 * Twilio side (their trunk, numbers) or our LiveKit side (per-org outbound
 * trunk, inbound allow-list entries). The provisioning lib will handle that
 * cleanup when called explicitly — disconnecting is "stop using these creds,"
 * not "delete everything we ever did with them."
 *
 * Caller should detach all PhoneNumber rows for this org first; see the
 * provisioning lib's `detachNumber`.
 */
export async function disconnect(orgId: OrgId): Promise<void> {
  await getPrisma().twilioConnection.deleteMany({ where: { orgId } });
}
