import { getPrisma } from "@/lib/db/client";

import { inngest } from "../client";

/**
 * Scan running campaigns for leads that are eligible to be called now (working
 * hours, cooldown, not yet exhausted) and emit `campaign/lead.ready` events.
 * Runs every minute.
 */
export const campaignTick = inngest.createFunction(
  { id: "campaign-tick" },
  { cron: "* * * * *" },
  async ({ step }) => {
    const campaigns = await step.run("load-running-campaigns", async () => {
      return getPrisma().campaign.findMany({
        where: { status: "RUNNING" },
        include: {
          _count: { select: { leads: { where: { status: "CALLING" } } } },
        },
      });
    });

    for (const campaign of campaigns) {
      if (campaign._count.leads >= campaign.concurrencyLimit) continue;
      if (!withinWorkingHours(campaign.workingHours)) continue;

      const slots = campaign.concurrencyLimit - campaign._count.leads;
      const leads = await step.run(`pick-leads-${campaign.id}`, async () => {
        return getPrisma().campaignLead.findMany({
          where: {
            campaignId: campaign.id,
            status: { in: ["PENDING", "NO_ANSWER", "VOICEMAIL"] },
            attempts: { lt: campaign.maxAttempts },
            OR: [{ nextEligibleAt: null }, { nextEligibleAt: { lte: new Date() } }],
          },
          orderBy: { createdAt: "asc" },
          take: slots,
        });
      });

      for (const lead of leads) {
        await step.sendEvent(`dispatch-${lead.id}`, {
          name: "campaign/lead.ready",
          data: { campaignId: campaign.id, leadId: lead.id },
        });
      }
    }

    return { ok: true, scanned: campaigns.length };
  },
);

function withinWorkingHours(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return true;
  const hours = raw as Record<string, { open?: string; close?: string } | null | undefined>;
  const now = new Date();
  const day = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][
    now.getDay()
  ];
  if (!day) return true;
  const block = hours[day];
  if (!block || !block.open || !block.close) return false;
  const [openH = 0, openM = 0] = block.open.split(":").map((n) => parseInt(n, 10));
  const [closeH = 23, closeM = 59] = block.close.split(":").map((n) => parseInt(n, 10));
  const minutes = now.getHours() * 60 + now.getMinutes();
  return minutes >= openH * 60 + openM && minutes < closeH * 60 + closeM;
}
