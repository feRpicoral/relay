"use server";

import { z } from "zod";

import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db/with-org";

type Result = { ok: true; campaignId: string; leadsAdded: number } | { ok: false; error: string };

const Schema = z.object({
  name: z.string().min(2).max(120),
  agentId: z.string().uuid(),
  fromPhoneNumberE164: z.string(),
  scriptPrompt: z.string().max(2000).default(""),
  csv: z.string().min(1),
  maxAttempts: z.number().int().min(1).max(10).default(3),
  cooldownMinutes: z.number().int().min(5).max(1440).default(60),
  concurrencyLimit: z.number().int().min(1).max(10).default(2),
});

export async function createCampaignAction(input: z.infer<typeof Schema>): Promise<Result> {
  const session = await requireAdmin();
  const parsed = Schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };

  const leads = parseCsv(parsed.data.csv);
  if (leads.length === 0) return { ok: false, error: "Nenhum lead válido encontrado no CSV." };

  const db = getDb(session.orgId);

  const campaign = await db.campaign.create({
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

  // Bulk insert leads. Skip duplicates inside the same campaign.
  await db.campaignLead.createMany({
    data: leads.map((l) => ({
      orgId: session.orgId,
      campaignId: campaign.id,
      phoneE164: l.phone,
      name: l.name ?? null,
    })),
    skipDuplicates: true,
  });

  return { ok: true, campaignId: campaign.id, leadsAdded: leads.length };
}

interface Lead {
  phone: string;
  name?: string;
}

function parseCsv(csv: string): Lead[] {
  const rows = csv
    .trim()
    .split(/\r?\n/)
    .filter((r) => r.trim().length > 0);
  if (rows.length === 0) return [];
  const header = rows[0]!.split(",").map((c) => c.trim().toLowerCase());
  const phoneIdx = header.indexOf("phone");
  const nameIdx = header.indexOf("name");
  if (phoneIdx === -1) return [];

  const out: Lead[] = [];
  for (const row of rows.slice(1)) {
    const cells = row.split(",").map((c) => c.trim());
    const phone = cells[phoneIdx];
    if (!phone || !/^\+\d{6,18}$/.test(phone)) continue;
    out.push({
      phone,
      name: nameIdx >= 0 ? cells[nameIdx] : undefined,
    });
  }
  return out;
}
