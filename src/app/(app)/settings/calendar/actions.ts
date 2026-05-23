"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/session";
import { listEventTypes, validateApiKey } from "@/lib/calendar/calcom";
import { encryptSecret } from "@/lib/crypto";
import { getDb } from "@/lib/db/with-org";
import type { Result } from "@/lib/types/result";

const ConnectSchema = z.object({
  apiKey: z.string().min(8).max(200),
});

export async function connectCalcomAction(input: z.infer<typeof ConnectSchema>): Promise<Result> {
  const t = await getTranslations("settings.calendar.connect.errors");
  const session = await requireAdmin();
  const parsed = ConnectSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: t("invalidKey") };

  let me;
  try {
    me = await validateApiKey(parsed.data.apiKey);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : t("rejected"),
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
  const t = await getTranslations("settings.calendar.eventType");
  const session = await requireAdmin();
  const parsed = EventTypeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: t("invalid") };

  const db = getDb(session.orgId);
  await db.calcomConnection.update({
    where: { orgId: session.orgId },
    data: { defaultEventTypeId: parsed.data.eventTypeId },
  });
  return { ok: true };
}

export async function listEventTypesAction(): Promise<
  Result<{ eventTypes: Array<{ id: number; title: string }> }>
> {
  const t = await getTranslations("settings.calendar.eventType");
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
      error: err instanceof Error ? err.message : t("loadFailed"),
    };
  }
}

export async function disconnectCalcomAction(): Promise<Result> {
  const session = await requireAdmin();
  const db = getDb(session.orgId);
  await db.calcomConnection.delete({ where: { orgId: session.orgId } }).catch(() => undefined);
  return { ok: true };
}
