"use server";

import { z } from "zod";

import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db/with-org";

type Result = { ok: true } | { ok: false; error: string };

const ConnectSchema = z.object({
  accessToken: z.string().min(8),
  refreshToken: z.string().min(8),
  managedUserEmail: z.string().email(),
  calcomUserId: z.number().int().positive(),
});

export async function connectCalcomAction(input: z.infer<typeof ConnectSchema>): Promise<Result> {
  const session = await requireAdmin();
  const parsed = ConnectSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Entrada inválida." };

  const db = getDb(session.orgId);
  await db.calcomConnection.upsert({
    where: { orgId: session.orgId },
    create: {
      orgId: session.orgId,
      accessToken: parsed.data.accessToken,
      refreshToken: parsed.data.refreshToken,
      managedUserEmail: parsed.data.managedUserEmail,
      calcomUserId: parsed.data.calcomUserId,
      expiresAt: new Date(Date.now() + 3600 * 1000),
      timezone: "America/Sao_Paulo",
    },
    update: {
      accessToken: parsed.data.accessToken,
      refreshToken: parsed.data.refreshToken,
      managedUserEmail: parsed.data.managedUserEmail,
      calcomUserId: parsed.data.calcomUserId,
      expiresAt: new Date(Date.now() + 3600 * 1000),
    },
  });
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

export async function disconnectCalcomAction(): Promise<Result> {
  const session = await requireAdmin();
  const db = getDb(session.orgId);
  await db.calcomConnection.delete({ where: { orgId: session.orgId } }).catch(() => undefined);
  return { ok: true };
}
