import { randomUUID } from "node:crypto";

import { getPrisma } from "@/lib/db/client";
import { asAgentId, asOrgId } from "@/lib/db/types";
import { buildRoomName, createRoom, placeOutboundSipCall } from "@/lib/voice/livekit";
import { createOutboundCall } from "@/lib/voice/persistence";

import { inngest } from "../client";
import { nextLeadStateForDispatchFailure } from "./campaign-lead-state";

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

    // Pre-allocate the call id so `livekitRoomName` lands on the initial
    // insert (live-monitor / hangup code needs it to issue tokens and delete
    // the room) and so retries are idempotent. The UUID generation MUST be
    // inside `step.run` — Inngest replays cache each step's result, so a bare
    // `randomUUID()` outside step.run would generate a new value on every
    // replay while `create-call` returned the cached original id, leaving
    // `roomName` and the row's `livekitRoomName` permanently out of sync.
    const preallocatedCallId = await step.run("allocate-call-id", async () => randomUUID());
    const roomName = buildRoomName(preallocatedCallId);

    const { callId } = await step.run("create-call", async () => {
      return createOutboundCall({
        id: preallocatedCallId,
        orgId: asOrgId(lead.orgId),
        agentId: asAgentId(lead.campaign.agentId),
        callerE164: lead.campaign.fromPhoneNumberE164,
        calleeE164: lead.phoneE164,
        livekitRoomName: roomName,
      });
    });

    await step.run("livekit-room", async () => {
      await createRoom(roomName, {
        callId,
        orgId: lead.orgId,
        agentId: lead.campaign.agentId,
        outbound: true,
      });
    });

    await step.run("mark-attempting", async () => {
      // Atomic: lead transition + attempt row must land together. Inngest
      // retries the whole step on failure, and the lead.update happens against
      // the same transaction so the attempt row can't be orphaned.
      await getPrisma().$transaction([
        getPrisma().campaignLead.update({
          where: { id: leadId },
          data: {
            status: "CALLING",
            attempts: { increment: 1 },
            lastAttemptAt: new Date(),
          },
        }),
        getPrisma().campaignAttempt.create({
          data: {
            orgId: lead.orgId,
            campaignId: lead.campaignId,
            leadId: lead.id,
            callId,
          },
        }),
      ]);
    });

    // Catch dispatch errors inside the step so Inngest doesn't retry forever
    // with the lead pinned in CALLING. After max attempts the lead is freed
    // (FAILED or scheduled for cooldown retry) so it stops consuming a
    // concurrency slot.
    const dispatchResult = await step.run("livekit-sip-outbound", async () => {
      try {
        const conn = await getPrisma().twilioConnection.findUnique({
          where: { orgId: lead.orgId },
          select: { livekitOutboundTrunkId: true },
        });
        if (!conn?.livekitOutboundTrunkId) {
          throw new Error(
            "Org has no LiveKit outbound trunk. Connect Twilio in Settings → Telefonia first.",
          );
        }
        await placeOutboundSipCall({
          trunkId: conn.livekitOutboundTrunkId,
          roomName,
          toE164: lead.phoneE164,
          participantIdentity: `sip-${lead.id}`,
          participantName: lead.name ?? lead.phoneE164,
        });
        return { ok: true as const };
      } catch (err) {
        return { ok: false as const, error: err instanceof Error ? err.message : String(err) };
      }
    });

    if (!dispatchResult.ok) {
      await step.run("compensate-failed-dispatch", async () => {
        const transition = nextLeadStateForDispatchFailure({
          priorAttempts: lead.attempts + 1,
          maxAttempts: lead.campaign.maxAttempts,
          cooldownMinutes: lead.campaign.cooldownMinutes,
        });
        await getPrisma().$transaction([
          getPrisma().campaignAttempt.updateMany({
            where: { leadId: lead.id, callId, endedAt: null },
            data: { endedAt: new Date(), errorMessage: dispatchResult.error },
          }),
          getPrisma().campaignLead.update({
            where: { id: leadId },
            data: {
              status: transition.status,
              outcome: transition.outcome,
              nextEligibleAt: transition.nextEligibleAt,
            },
          }),
          getPrisma().call.updateMany({
            where: { id: callId },
            data: { status: "FAILED", endedAt: new Date() },
          }),
        ]);
      });
      return { ok: false, callId, leadId, error: dispatchResult.error };
    }

    return { ok: true, callId, leadId };
  },
);
