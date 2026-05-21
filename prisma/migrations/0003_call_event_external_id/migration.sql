-- CallEvent.external_id holds an idempotency key for events received from
-- external systems (LiveKit webhooks). Same delivery id is sent on retries;
-- the unique constraint dedupes them so the timeline doesn't grow duplicates.

ALTER TABLE "call_events" ADD COLUMN "external_id" TEXT;

CREATE UNIQUE INDEX "call_events_external_id_key" ON "call_events"("external_id");
