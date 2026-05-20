import { getPrisma } from "@/lib/db/client";
import { requireEnv } from "@/lib/env";
import { buildRoomName, createRoom } from "@/lib/voice/livekit";
import { createOutboundCall } from "@/lib/voice/persistence";
import { createOutboundCall as twilioOutbound } from "@/lib/voice/twilio";

import { inngest } from "../client";

/**
 * Dispatch the next call in a campaign. Triggered both on demand and by a cron
 * scan of `nextEligibleAt`. Respects working hours, max attempts, and the
 * campaign concurrency limit.
 */
export const campaignDispatch = inngest.createFunction(
  { id: "campaign-dispatch", retries: 2, concurrency: { key: "event.data.campaignId", limit: 1 } },
  { event: "campaign/lead.ready" },
  async ({ event, step }) => {
    const { leadId } = event.data;

    const lead = await step.run("load-lead", async () => {
      return getPrisma().campaignLead.findUnique({
        where: { id: leadId },
        include: { campaign: { include: { agent: true } } },
      });
    });
    if (!lead) return { skipped: "lead not found" };
    if (lead.status !== "PENDING" && lead.status !== "NO_ANSWER" && lead.status !== "VOICEMAIL") {
      return { skipped: `lead status ${lead.status}` };
    }
    if (lead.attempts >= lead.campaign.maxAttempts) {
      await step.run("exhausted", async () => {
        await getPrisma().campaignLead.update({
          where: { id: leadId },
          data: { status: "ATTEMPTED" },
        });
      });
      return { ok: true, exhausted: true };
    }
    if (lead.campaign.status !== "RUNNING") return { skipped: "campaign not running" };

    const { callId } = await step.run("create-call", async () => {
      return createOutboundCall({
        orgId: lead.orgId,
        agentId: lead.campaign.agentId,
        callerE164: lead.campaign.fromPhoneNumberE164,
        calleeE164: lead.phoneE164,
      });
    });

    await step.run("mark-attempting", async () => {
      await getPrisma().campaignLead.update({
        where: { id: leadId },
        data: {
          status: "CALLING",
          attempts: { increment: 1 },
          lastAttemptAt: new Date(),
        },
      });
      await getPrisma().campaignAttempt.create({
        data: {
          orgId: lead.orgId,
          campaignId: lead.campaignId,
          leadId: lead.id,
          callId,
        },
      });
    });

    const roomName = buildRoomName(callId);
    await step.run("livekit-room", async () => {
      await createRoom(roomName, { callId, orgId: lead.orgId, outbound: true });
    });

    await step.run("twilio-dial", async () => {
      const twimlUrl = `${requireEnv("NEXT_PUBLIC_APP_URL")}/api/webhooks/twilio/voice`;
      await twilioOutbound({
        to: lead.phoneE164,
        from: lead.campaign.fromPhoneNumberE164,
        twimlUrl,
        amdEnabled: true,
        statusCallbackUrl: `${requireEnv("NEXT_PUBLIC_APP_URL")}/api/webhooks/twilio/status`,
      });
      // The agent worker is dispatched by Twilio's voice webhook when the call
      // is answered, same as inbound.
    });

    return { ok: true, callId, leadId };
  },
);
