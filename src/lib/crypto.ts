// Intentionally NOT importing "server-only" here. The worker (run via tsx,
// no Next webpack) loads this module transitively through the Twilio decrypt
// path, and "server-only" throws on import outside a Next Server Component
// boundary. Keep this file pure Node so both the web app and the worker can
// use it.

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

import { requireEnv } from "@/lib/env";

/**
 * Symmetric encryption for secrets stored in the database (currently used by
 * `TwilioConnection.authTokenEncrypted`). AES-256-GCM with a per-secret random
 * nonce so two encryptions of the same plaintext produce different ciphertexts.
 *
 * Storage format: `gcm:<nonce>:<authTag>:<ciphertext>` (all base64), encoded as
 * a single TEXT column. The `gcm:` prefix is there so future rotations to a
 * different cipher don't silently corrupt data.
 *
 * Key derivation: ENCRYPTION_KEY env var is run through scrypt to produce the
 * 32-byte symmetric key. ENCRYPTION_KEY must be at least 32 chars; the
 * scrypt-derived bytes are what AES actually uses, but a short input would let
 * an attacker brute-force the password if the DB leaks.
 */

const ALGO = "aes-256-gcm";
const KEY_LENGTH = 32;
const NONCE_LENGTH = 12;
// A fixed scrypt salt is fine here: scrypt is being used as a slow KDF on a
// long secret, not as a password hash. Per-entry salt would force us to store
// the salt alongside ciphertext for no real security gain.
const SALT = "relay.encryption.v1";

// scrypt is intentionally slow (~100ms per call). The derived key is
// deterministic from ENCRYPTION_KEY + SALT, so we compute it once per process
// and cache. ENCRYPTION_KEY rotation requires a redeploy anyway.
let cachedKey: Buffer | null = null;

function key(): Buffer {
  if (cachedKey) return cachedKey;
  const secret = requireEnv("ENCRYPTION_KEY");
  if (secret.length < 32) {
    throw new Error("ENCRYPTION_KEY must be at least 32 characters.");
  }
  cachedKey = scryptSync(secret, SALT, KEY_LENGTH);
  return cachedKey;
}

export function encryptSecret(plaintext: string): string {
  const nonce = randomBytes(NONCE_LENGTH);
  const cipher = createCipheriv(ALGO, key(), nonce);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [
    "gcm",
    nonce.toString("base64"),
    authTag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(":");
}

export function decryptSecret(payload: string): string {
  const parts = payload.split(":");
  if (parts.length !== 4 || parts[0] !== "gcm") {
    throw new Error("Encrypted payload does not match expected format.");
  }
  const [, nonceB64, authTagB64, ciphertextB64] = parts;
  const nonce = Buffer.from(nonceB64!, "base64");
  const authTag = Buffer.from(authTagB64!, "base64");
  const ciphertext = Buffer.from(ciphertextB64!, "base64");
  const decipher = createDecipheriv(ALGO, key(), nonce);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString("utf8");
}
