"use server";

import { z } from "zod";

import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db/with-org";

type Result = { ok: true } | { ok: false; error: string };

const E164 = z.string().regex(/^\+\d{6,18}$/, "Use formato E.164: +5511999998888");

const AddSchema = z.object({
  e164: E164,
  label: z.string().max(120).optional(),
  agentId: z.string().uuid(),
});

export async function addPhoneNumberAction(input: z.infer<typeof AddSchema>): Promise<Result> {
  const session = await requireAdmin();
  const parsed = AddSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Entrada inválida." };
  }
  const db = getDb(session.orgId);
  try {
    await db.phoneNumber.create({
      data: {
        orgId: session.orgId,
        agentId: parsed.data.agentId,
        e164: parsed.data.e164,
        label: parsed.data.label,
      },
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unique")) {
      return { ok: false, error: "Esse número já está conectado." };
    }
    return { ok: false, error: err instanceof Error ? err.message : "Falhou." };
  }
  return { ok: true };
}

const AssignSchema = z.object({
  phoneNumberId: z.string().uuid(),
  agentId: z.string().uuid(),
});

export async function assignAgentAction(input: z.infer<typeof AssignSchema>): Promise<Result> {
  const session = await requireAdmin();
  const parsed = AssignSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Entrada inválida." };

  const db = getDb(session.orgId);
  await db.phoneNumber.update({
    where: { id: parsed.data.phoneNumberId },
    data: { agentId: parsed.data.agentId },
  });
  return { ok: true };
}

const RemoveSchema = z.object({ phoneNumberId: z.string().uuid() });

export async function removePhoneNumberAction(
  input: z.infer<typeof RemoveSchema>,
): Promise<Result> {
  const session = await requireAdmin();
  const parsed = RemoveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Entrada inválida." };

  const db = getDb(session.orgId);
  await db.phoneNumber.delete({ where: { id: parsed.data.phoneNumberId } });
  return { ok: true };
}
