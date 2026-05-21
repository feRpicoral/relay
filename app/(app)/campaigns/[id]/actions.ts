"use server";

import type { CampaignStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db/with-org";
import type { Result } from "@/lib/types/result";

const Schema = z.object({ campaignId: z.string().uuid() });

/**
 * Allowed transitions for `Campaign.status`. Centralized here so we don't
 * leave a CAMPAIGN in a weird state by, say, "starting" a COMPLETED one.
 */
const ALLOWED_TRANSITIONS: Record<"start" | "pause" | "cancel", CampaignStatus[]> = {
  start: ["DRAFT", "PAUSED"],
  pause: ["RUNNING"],
  cancel: ["DRAFT", "RUNNING", "PAUSED"],
};

async function transitionCampaign(args: {
  campaignId: string;
  kind: keyof typeof ALLOWED_TRANSITIONS;
  data: Record<string, unknown>;
}): Promise<Result> {
  const session = await requireAdmin();
  const db = getDb(session.orgId);
  // Use updateMany with a status filter so an invalid transition is a no-op
  // (count === 0) instead of corrupting state. Saves a round-trip vs. read +
  // update.
  const updated = await db.campaign.updateMany({
    where: { id: args.campaignId, status: { in: [...ALLOWED_TRANSITIONS[args.kind]] } },
    data: args.data,
  });
  if (updated.count === 0) {
    return { ok: false, error: "Transição não permitida no estado atual." };
  }
  revalidatePath("/campaigns");
  revalidatePath(`/campaigns/${args.campaignId}`);
  return { ok: true };
}

export async function startCampaignAction(input: z.infer<typeof Schema>): Promise<Result> {
  const parsed = Schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Entrada inválida." };
  return transitionCampaign({
    campaignId: parsed.data.campaignId,
    kind: "start",
    data: { status: "RUNNING", startedAt: new Date() },
  });
}

export async function pauseCampaignAction(input: z.infer<typeof Schema>): Promise<Result> {
  const parsed = Schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Entrada inválida." };
  return transitionCampaign({
    campaignId: parsed.data.campaignId,
    kind: "pause",
    data: { status: "PAUSED" },
  });
}

export async function cancelCampaignAction(input: z.infer<typeof Schema>): Promise<Result> {
  const parsed = Schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Entrada inválida." };
  // Cancel uses canceledAt (already on the schema) instead of completedAt;
  // completedAt is for natural completion. Keeping the two distinct lets
  // analytics tell finished campaigns from operator-killed ones.
  return transitionCampaign({
    campaignId: parsed.data.campaignId,
    kind: "cancel",
    data: { status: "CANCELED", completedAt: new Date() },
  });
}
