"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { z } from "zod";

import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth/session";
import { E164, parseLeads } from "@/lib/campaigns/parse-leads";
import { getDb } from "@/lib/db/with-org";
import type { Result } from "@/lib/types/result";

const MAX_CSV_BYTES = 2 * 1024 * 1024; // 2 MiB
const MAX_LEADS_PER_UPLOAD = 10_000;

const Schema = z.object({
  name: z.string().trim().min(2).max(120),
  agentId: z.string().uuid(),
  fromPhoneNumberE164: z.string().regex(E164, "INVALID_PHONE"),
  scriptPrompt: z.string().max(2000).default(""),
  csv: z.string().min(1).max(MAX_CSV_BYTES),
  maxAttempts: z.number().int().min(1).max(10).default(3),
  cooldownMinutes: z.number().int().min(5).max(1440).default(60),
  concurrencyLimit: z.number().int().min(1).max(10).default(2),
});

export async function createCampaignAction(
  input: z.infer<typeof Schema>,
): Promise<Result<{ campaignId: string; leadsAdded: number }>> {
  const t = await getTranslations("campaigns.new.errors");
  const session = await requireAdmin();
  const parsed = Schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: t("invalidData") };

  const db = getDb(session.orgId);

  // Defense-in-depth: the FK insert below would fail if these don't belong to
  // the org, but the error surfaces as opaque Prisma.
  const agent = await db.agent.findFirst({
    where: { id: parsed.data.agentId },
    select: { id: true },
  });
  if (!agent) return { ok: false, error: t("noAgents") };
  const phone = await db.phoneNumber.findFirst({
    where: { e164: parsed.data.fromPhoneNumberE164, outbound: true },
    select: { id: true },
  });
  if (!phone) return { ok: false, error: t("noNumbers") };

  const { valid: leads } = parseLeads(parsed.data.csv);
  if (leads.length === 0) return { ok: false, error: t("invalidCsv") };
  if (leads.length > MAX_LEADS_PER_UPLOAD) {
    return { ok: false, error: t("tooManyLeads") };
  }

  const campaign = await db.$transaction(async (tx) => {
    const created = await tx.campaign.create({
      data: {
        orgId: session.orgId,
        name: parsed.data.name,
        agentId: parsed.data.agentId,
        fromPhoneNumberE164: parsed.data.fromPhoneNumberE164,
        scriptPrompt: parsed.data.scriptPrompt,
        maxAttempts: parsed.data.maxAttempts,
        cooldownMinutes: parsed.data.cooldownMinutes,
        concurrencyLimit: parsed.data.concurrencyLimit,
        workingHours: {
          timezone: "America/Sao_Paulo",
          monday: { open: "09:00", close: "18:00" },
          tuesday: { open: "09:00", close: "18:00" },
          wednesday: { open: "09:00", close: "18:00" },
          thursday: { open: "09:00", close: "18:00" },
          friday: { open: "09:00", close: "18:00" },
        },
      },
    });

    await tx.campaignLead.createMany({
      data: leads.map((l) => ({
        orgId: session.orgId,
        campaignId: created.id,
        phoneE164: l.phone,
        name: l.name ?? null,
      })),
      skipDuplicates: true,
    });

    return created;
  });

  await audit(db, session.orgId, {
    action: "CREATE",
    entity: "CAMPAIGN",
    entityId: campaign.id,
    userId: session.userId,
    metadata: { name: campaign.name, leads: leads.length },
  });

  revalidatePath("/campaigns");
  return { ok: true, campaignId: campaign.id, leadsAdded: leads.length };
}
