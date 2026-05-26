import { Inngest } from "inngest";

import { isProduction, optionalEnv, requireEnv } from "@/lib/env";

// Inngest's `serve()` validates inbound function-invocation signatures using
// `signingKey`. Without it anyone who can reach `/api/inngest` can trigger
// arbitrary functions, so production must fail fast at module load rather
// than silently boot in an unsafe configuration. The `eventKey` is what
// `inngest.send(...)` uses to authenticate outbound events; mismatched or
// missing keys in prod would silently drop campaign/post-call triggers.
const eventKey = isProduction ? requireEnv("INNGEST_EVENT_KEY") : optionalEnv("INNGEST_EVENT_KEY");
const signingKey = isProduction
  ? requireEnv("INNGEST_SIGNING_KEY")
  : optionalEnv("INNGEST_SIGNING_KEY");

export const inngest = new Inngest({
  id: "relay",
  eventKey,
  signingKey,
});

export type RelayEvent =
  | { name: "call/completed"; data: { callId: string } }
  | { name: "campaign/lead.ready"; data: { campaignId: string; leadId: string } }
  | { name: "campaign/lead.attempt-result"; data: { attemptId: string; outcome: string } };
