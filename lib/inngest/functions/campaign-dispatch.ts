import { getPrisma } from "@/lib/db/client";
import { buildRoomName, createRoom, placeOutboundSipCall } from "@/lib/voice/livekit";
import { createOutboundCall } from "@/lib/voice/persistence";

import { inngest } from "../client";

/**
 * Dispatch the next call in a campaign. Triggered both on demand and by a cron
 * scan of `nextEligibleAt`. Respects working hours, max attempts, and the
 * campaign concurrency limit.
 *
 * Outbound dialing happens through LiveKit's SIP service, LiveKit originates
 * the SIP INVITE to the configured outbound trunk (typically Twilio's elastic
 * SIP trunk), which carries it to PSTN. The same agent worker that handles
 * inbound rooms picks up this room via the framework's job dispatch.
 */
export const campaignDispatch = inngest.createFunction(
  {
    id: "campaign-dispatch",
    retries: 2,
    concurrency: { key: "event.data.campaignId", limit: 1 },
    triggers: [{ event: "campaign/lead.ready" }],
  },
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

    const roomName = buildRoomName(callId);
    await step.run("livekit-room", async () => {
      await createRoom(roomName, {
        callId,
        orgId: lead.orgId,
        agentId: lead.campaign.agentId,
        outbound: true,
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

    await step.run("livekit-sip-outbound", async () => {
      await placeOutboundSipCall({
        roomName,
        toE164: lead.phoneE164,
        participantIdentity: `sip-${lead.id}`,
        participantName: lead.name ?? lead.phoneE164,
      });
    });

    return { ok: true, callId, leadId };
  },
);
