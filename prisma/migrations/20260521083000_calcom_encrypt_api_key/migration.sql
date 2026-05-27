-- Cal.com personal API keys are now encrypted at rest via lib/crypto, matching
-- the TwilioConnection.auth_token_encrypted pattern. The previous plaintext
-- api_key column is dropped; any existing rows must reconnect via Settings →
-- Cal.com to repopulate `api_key_encrypted`.

ALTER TABLE "calcom_connections" DROP COLUMN "api_key";

ALTER TABLE "calcom_connections" ADD COLUMN "api_key_encrypted" TEXT;
