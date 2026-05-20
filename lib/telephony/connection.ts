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
  twilioTrunkSid: string | null;
  livekitOutboundTrunkId: string | null;
}

export async function getConnectionStatus(orgId: OrgId): Promise<ConnectionStatus> {
  const conn = await getPrisma().twilioConnection.findUnique({ where: { orgId } });
  if (!conn) {
    return {
      connected: false,
      accountSid: null,
      twilioTrunkSid: null,
      livekitOutboundTrunkId: null,
    };
  }
  return {
    connected: true,
    accountSid: conn.accountSid,
    twilioTrunkSid: conn.twilioTrunkSid,
    livekitOutboundTrunkId: conn.livekitOutboundTrunkId,
  };
}

/**
 * Validate the supplied credentials by hitting Twilio's account endpoint, then
 * persist them encrypted. Replaces any existing connection (one per org).
 */
export async function connect(orgId: OrgId, creds: TwilioCredentials): Promise<void> {
  const client = buildTwilioClient(creds);
  // The cheapest endpoint that exercises auth: fetching the account itself.
  // Throws on bad creds, suspended accounts, or wrong account SID.
  await client.api.v2010.accounts(creds.accountSid).fetch();

  const authTokenEncrypted = encryptSecret(creds.apiKeySecret);
  await getPrisma().twilioConnection.upsert({
    where: { orgId },
    create: {
      orgId,
      accountSid: creds.accountSid,
      apiKeySid: creds.apiKeySid,
      authTokenEncrypted,
    },
    update: {
      accountSid: creds.accountSid,
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
