-- Org-level display defaults surfaced read-only in Settings → Organization.
-- `timezone` drives the analytics heatmap day/hour grouping (calls stay in UTC);
-- `default_agent_language` pre-selects the language when creating a new agent.
-- `account_name` caches the Twilio account friendly name fetched on connect so
-- Settings can render it without a Twilio API round-trip per page load.

ALTER TABLE "organizations" ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo';
ALTER TABLE "organizations" ADD COLUMN "default_agent_language" "AgentLanguage" NOT NULL DEFAULT 'PT_BR';
ALTER TABLE "twilio_connections" ADD COLUMN "account_name" TEXT;
