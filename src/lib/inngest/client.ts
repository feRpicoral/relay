import { Inngest } from "inngest";

import { optionalEnv } from "@/lib/env";

export const inngest = new Inngest({
  id: "relay",
  eventKey: optionalEnv("INNGEST_EVENT_KEY"),
  // Required so `inngest/next` serve() validates incoming function-invocation
  // signatures. Without it, anyone who can POST to /api/inngest can trigger
  // arbitrary functions.
  signingKey: optionalEnv("INNGEST_SIGNING_KEY"),
});

export type RelayEvent =
  | { name: "call/completed"; data: { callId: string } }
  | { name: "campaign/lead.ready"; data: { campaignId: string; leadId: string } }
  | { name: "campaign/lead.attempt-result"; data: { attemptId: string; outcome: string } };
