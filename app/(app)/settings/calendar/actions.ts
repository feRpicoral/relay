"use server";

import { z } from "zod";

import { requireAdmin } from "@/lib/auth/session";
import { listEventTypes, provisionCalcomManagedUser } from "@/lib/calendar/calcom";
import { getDb } from "@/lib/db/with-org";
import { slugify } from "@/lib/slug";

type Result = { ok: true } | { ok: false; error: string };

/**
 * Provisions a Cal.com Platform managed user for this org and stores the
 * tokens. The org admin's email is used as the managed-user identity, with a
 * `relay-<slug>` namespace suffix to avoid colliding if they already have a
 * personal Cal.com account.
 */
export async function connectCalcomAction(): Promise<Result> {
  const session = await requireAdmin();
  try {
    const managedEmail = namespacedEmail(session.email, session.orgSlug);
    await provisionCalcomManagedUser({
      orgId: session.orgId,
      email: managedEmail,
      name: session.orgName,
    });
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to connect Cal.com.",
    };
  }
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

function namespacedEmail(email: string, orgSlug: string): string {
  const [user, domain] = email.split("@");
  if (!user || !domain) return email;
  return `${user}+relay-${slugify(orgSlug)}@${domain}`;
}
