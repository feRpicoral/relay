"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db/with-org";

type Result = { ok: true; campaignId: string; leadsAdded: number } | { ok: false; error: string };

/** Cap the CSV body to keep the action from buffering an unbounded blob. */
const MAX_CSV_BYTES = 2 * 1024 * 1024; // 2 MiB
/** Cap how many leads a single campaign can ingest in one upload. */
const MAX_LEADS_PER_UPLOAD = 10_000;

const E164 = /^\+\d{6,18}$/;

const Schema = z.object({
  name: z.string().trim().min(2).max(120),
  agentId: z.string().uuid(),
  fromPhoneNumberE164: z.string().regex(E164, "Número inválido"),
  scriptPrompt: z.string().max(2000).default(""),
  csv: z.string().min(1).max(MAX_CSV_BYTES),
  maxAttempts: z.number().int().min(1).max(10).default(3),
  cooldownMinutes: z.number().int().min(5).max(1440).default(60),
  concurrencyLimit: z.number().int().min(1).max(10).default(2),
});

export async function createCampaignAction(input: z.infer<typeof Schema>): Promise<Result> {
  const session = await requireAdmin();
  const parsed = Schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };

  const db = getDb(session.orgId);

  // Defense-in-depth: the FK insert below would fail if these don't belong to
  // the org, but the error surfaces as opaque Prisma. Verify explicitly so we
  // can return a friendly message and avoid leaking FK error wording.
  const agent = await db.agent.findFirst({
    where: { id: parsed.data.agentId },
    select: { id: true },
  });
  if (!agent) return { ok: false, error: "Agente não encontrado." };
  const phone = await db.phoneNumber.findFirst({
    where: { e164: parsed.data.fromPhoneNumberE164, outbound: true },
    select: { id: true },
  });
  if (!phone) {
    return { ok: false, error: "Número não encontrado ou sem outbound habilitado." };
  }

  const leads = parseCsv(parsed.data.csv);
  if (leads.length === 0) return { ok: false, error: "Nenhum lead válido encontrado no CSV." };
  if (leads.length > MAX_LEADS_PER_UPLOAD) {
    return {
      ok: false,
      error: `CSV tem mais de ${MAX_LEADS_PER_UPLOAD} leads. Divida em arquivos menores.`,
    };
  }

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

  revalidatePath("/campaigns");
  return { ok: true, campaignId: campaign.id, leadsAdded: leads.length };
}

interface Lead {
  phone: string;
  name?: string;
}

/**
 * Minimal CSV parser: comma-separated, expects a header row with at least a
 * `phone` column and optional `name`. Does not handle quoted fields or
 * embedded commas — campaigns import data we control. Swap in papaparse if
 * that assumption ever breaks.
 */
function parseCsv(csv: string): Lead[] {
  const rows = csv
    .trim()
    .split(/\r?\n/)
    .filter((r) => r.trim().length > 0);
  if (rows.length === 0) return [];
  const headerRow = rows[0];
  if (!headerRow) return [];
  const header = headerRow.split(",").map((c) => c.trim().toLowerCase());
  const phoneIdx = header.indexOf("phone");
  const nameIdx = header.indexOf("name");
  if (phoneIdx === -1) return [];

  const out: Lead[] = [];
  for (const row of rows.slice(1)) {
    const cells = row.split(",").map((c) => c.trim());
    const phone = cells[phoneIdx];
    if (!phone || !E164.test(phone)) continue;
    out.push({
      phone,
      name: nameIdx >= 0 ? cells[nameIdx] : undefined,
    });
  }
  return out;
}
