"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db/with-org";
import type { Result } from "@/lib/types/result";
import { E164_REGEX } from "@/lib/validation/phone";
import { BusinessHoursSchema } from "@/lib/voice/types";

const E164 = z.string().regex(E164_REGEX, "Use formato E.164: +5511999998888");

const SettingsSchema = z.object({
  agentId: z.string().uuid(),
  name: z.string().trim().min(2).max(120),
  language: z.enum(["PT_BR", "EN_US", "AUTO"]),
  personaPrompt: z.string().max(4000),
  greeting: z.string().max(280),
  fallbackTransferE164: E164.nullable(),
  enabled: z.boolean(),
});

export async function updateAgentSettingsAction(
  input: z.infer<typeof SettingsSchema>,
): Promise<Result> {
  const session = await requireAdmin();
  const parsed = SettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Entrada inválida." };
  }

  const db = getDb(session.orgId);
  await db.agent.update({
    where: { id: parsed.data.agentId },
    data: {
      name: parsed.data.name,
      language: parsed.data.language,
      personaPrompt: parsed.data.personaPrompt,
      greeting: parsed.data.greeting,
      fallbackTransferE164: parsed.data.fallbackTransferE164,
      enabled: parsed.data.enabled,
    },
  });
  revalidatePath("/agents");
  revalidatePath(`/agents/${parsed.data.agentId}`);
  return { ok: true };
}

const VoiceSchema = z.object({
  agentId: z.string().uuid(),
  voiceId: z.string().min(1),
  ttsProvider: z.enum(["CARTESIA", "ELEVENLABS"]),
});

export async function updateAgentVoiceAction(input: z.infer<typeof VoiceSchema>): Promise<Result> {
  const session = await requireAdmin();
  const parsed = VoiceSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Entrada inválida." };

  const db = getDb(session.orgId);
  await db.agent.update({
    where: { id: parsed.data.agentId },
    data: { voiceId: parsed.data.voiceId, ttsProvider: parsed.data.ttsProvider },
  });
  revalidatePath(`/agents/${parsed.data.agentId}`);
  return { ok: true };
}

const HoursSchema = z.object({
  agentId: z.string().uuid(),
  hours: BusinessHoursSchema,
});

export async function updateBusinessHoursAction(
  input: z.infer<typeof HoursSchema>,
): Promise<Result> {
  const session = await requireAdmin();
  const parsed = HoursSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Horários inválidos." };

  const db = getDb(session.orgId);
  await db.agent.update({
    where: { id: parsed.data.agentId },
    data: { businessHours: parsed.data.hours },
  });
  revalidatePath(`/agents/${parsed.data.agentId}`);
  return { ok: true };
}

const DocCreateSchema = z.object({
  agentId: z.string().uuid(),
  title: z.string().trim().min(2).max(200),
  body: z.string().min(2).max(50_000),
});

export async function createKnowledgeDocAction(
  input: z.infer<typeof DocCreateSchema>,
): Promise<Result> {
  const session = await requireAdmin();
  const parsed = DocCreateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Documento inválido." };

  const db = getDb(session.orgId);
  await db.knowledgeDoc.create({
    data: {
      orgId: session.orgId,
      agentId: parsed.data.agentId,
      title: parsed.data.title,
      body: parsed.data.body,
    },
  });
  revalidatePath(`/agents/${parsed.data.agentId}`);
  return { ok: true };
}

const DocDeleteSchema = z.object({ docId: z.string().uuid(), agentId: z.string().uuid() });

export async function deleteKnowledgeDocAction(
  input: z.infer<typeof DocDeleteSchema>,
): Promise<Result> {
  const session = await requireAdmin();
  const parsed = DocDeleteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Entrada inválida." };

  const db = getDb(session.orgId);
  await db.knowledgeDoc.deleteMany({ where: { id: parsed.data.docId } });
  revalidatePath(`/agents/${parsed.data.agentId}`);
  return { ok: true };
}

const DeleteAgentSchema = z.object({ agentId: z.string().uuid() });

export async function deleteAgentAction(input: z.infer<typeof DeleteAgentSchema>): Promise<Result> {
  const session = await requireAdmin();
  const parsed = DeleteAgentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Entrada inválida." };

  const db = getDb(session.orgId);
  // The Agent FK cascades on call/phone-number/knowledge-doc/campaign delete.
  // We surface a friendly error if any of those constraints reject so the user
  // doesn't see an opaque Prisma error.
  try {
    await db.agent.delete({ where: { id: parsed.data.agentId } });
  } catch (err) {
    console.warn("[deleteAgentAction] delete failed", err);
    return {
      ok: false,
      error: "Não foi possível remover o agente. Verifique se há chamadas ou campanhas ativas.",
    };
  }
  revalidatePath("/agents");
  return { ok: true };
}
