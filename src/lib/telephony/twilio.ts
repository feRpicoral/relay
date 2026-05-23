import "server-only";

import twilio, { type Twilio } from "twilio";

import { decryptSecret } from "@/lib/crypto";
import { getPrisma } from "@/lib/db/client";
import type { OrgId } from "@/lib/db/types";

/**
 * Per-org Twilio client. Loads the org's stored API Key credentials from
 * `TwilioConnection` and instantiates a Twilio SDK client.
 *
 * Twilio supports two credential styles:
 *   1. Account SID + master Auth Token (god-mode for the account)
 *   2. Account SID + API Key SID + API Key Secret (scoped, revocable)
 *
 * We use (2). The user pastes a Standard API Key created in Twilio's console
 * (Account, API keys & tokens). The secret is the only thing shown once on
 * creation, so we encrypt it before storage; on every read we decrypt and pass
 * it to the SDK as the "auth" argument.
 */
export async function getTwilioClient(orgId: OrgId): Promise<Twilio> {
  const conn = await getPrisma().twilioConnection.findUnique({ where: { orgId } });
  if (!conn) {
    throw new TwilioNotConnectedError();
  }
  const authToken = decryptSecret(conn.authTokenEncrypted);
  return twilio(conn.apiKeySid, authToken, { accountSid: conn.accountSid });
}

export class TwilioNotConnectedError extends Error {
  constructor() {
    super("twilio_not_connected");
    this.name = "TwilioNotConnectedError";
  }
}

/**
 * Stateless client used during the connect flow, before any TwilioConnection
 * row exists. Used only to validate the credentials the user pasted.
 */
export function buildTwilioClient(creds: {
  accountSid: string;
  apiKeySid: string;
  apiKeySecret: string;
}): Twilio {
  return twilio(creds.apiKeySid, creds.apiKeySecret, { accountSid: creds.accountSid });
}
