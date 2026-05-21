"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/session";
import { listEventTypes, validateApiKey } from "@/lib/calendar/calcom";
import { encryptSecret } from "@/lib/crypto";
import { getDb } from "@/lib/db/with-org";

type Result = { ok: true } | { ok: false; error: string };

const ConnectSchema = z.object({
  apiKey: z.string().min(8).max(200),
});

export async function connectCalcomAction(input: z.infer<typeof ConnectSchema>): Promise<Result> {
  const session = await requireAdmin();
  const parsed = ConnectSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "API key inválida." };

  let me;
  try {
    me = await validateApiKey(parsed.data.apiKey);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Cal.com rejeitou a API key.",
    };
  }

  const db = getDb(session.orgId);
  const apiKeyEncrypted = encryptSecret(parsed.data.apiKey);
  await db.calcomConnection.upsert({
    where: { orgId: session.orgId },
    create: {
      orgId: session.orgId,
      apiKeyEncrypted,
      calcomUserEmail: me.email,
      timezone: me.timezone,
    },
    update: {
      apiKeyEncrypted,
      calcomUserEmail: me.email,
      timezone: me.timezone,
    },
  });

  revalidatePath("/settings/calendar");
  return { ok: true };
}

const EventTypeSchema = z.object({ eventTypeId: z.number().int().positive() });

export async function setDefaultEventTypeAction(
  input: z.infer<typeof EventTypeSchema>,
): Promise<Result> {
  const session = await requireAdmin();
  const parsed = EventTypeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Entrada inválida." };

  const db = getDb(session.orgId);
  await db.calcomConnection.update({
    where: { orgId: session.orgId },
    data: { defaultEventTypeId: parsed.data.eventTypeId },
  });
  return { ok: true };
}

export async function listEventTypesAction(): Promise<
  { ok: true; eventTypes: Array<{ id: number; title: string }> } | { ok: false; error: string }
> {
  const session = await requireAdmin();
  try {
    const eventTypes = await listEventTypes(session.orgId);
    return {
      ok: true,
      eventTypes: eventTypes.map((e) => ({ id: e.id, title: e.title })),
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to list event types.",
    };
  }
}

export async function disconnectCalcomAction(): Promise<Result> {
  const session = await requireAdmin();
  const db = getDb(session.orgId);
  await db.calcomConnection.delete({ where: { orgId: session.orgId } }).catch(() => undefined);
  return { ok: true };
}
