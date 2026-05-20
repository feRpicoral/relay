import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "relay",
  eventKey: process.env.INNGEST_EVENT_KEY,
});

export type RelayEvent =
  | { name: "call/completed"; data: { callId: string } }
  | { name: "campaign/lead.ready"; data: { campaignId: string; leadId: string } }
  | { name: "campaign/lead.attempt-result"; data: { attemptId: string; outcome: string } };
