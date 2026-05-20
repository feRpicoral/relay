"use server";

import { z } from "zod";

import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db/with-org";

type Result = { ok: true } | { ok: false; error: string };

const Schema = z.object({ campaignId: z.string().uuid() });

export async function startCampaignAction(input: z.infer<typeof Schema>): Promise<Result> {
  const session = await requireAdmin();
  const parsed = Schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Entrada inválida." };
  const db = getDb(session.orgId);
  await db.campaign.update({
    where: { id: parsed.data.campaignId },
    data: { status: "RUNNING", startedAt: new Date() },
  });
  return { ok: true };
}

export async function pauseCampaignAction(input: z.infer<typeof Schema>): Promise<Result> {
  const session = await requireAdmin();
  const parsed = Schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Entrada inválida." };
  const db = getDb(session.orgId);
  await db.campaign.update({
    where: { id: parsed.data.campaignId },
    data: { status: "PAUSED" },
  });
  return { ok: true };
}

export async function cancelCampaignAction(input: z.infer<typeof Schema>): Promise<Result> {
  const session = await requireAdmin();
  const parsed = Schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Entrada inválida." };
  const db = getDb(session.orgId);
  await db.campaign.update({
    where: { id: parsed.data.campaignId },
    data: { status: "CANCELED", completedAt: new Date() },
  });
  return { ok: true };
}
