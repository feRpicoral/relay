"use server";

import { randomBytes } from "node:crypto";

import { cookies } from "next/headers";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/session";
import { getAuthorizeUrl, listEventTypes } from "@/lib/calendar/calcom";
import { CALCOM_OAUTH_STATE_COOKIE } from "@/lib/calendar/oauth-state";
import { getDb } from "@/lib/db/with-org";
import { requireEnv } from "@/lib/env";

type Result = { ok: true } | { ok: false; error: string };

/**
 * Generate an authorize URL for Cal.com's OAuth Client flow and stash an
 * anti-CSRF token in an HttpOnly cookie. The client form does
 * `window.location.href = result.url` to start the redirect dance.
 */
export async function startCalcomOAuthAction(): Promise<
  { ok: true; url: string } | { ok: false; error: string }
> {
  await requireAdmin();

  const state = randomBytes(32).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set(CALCOM_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 300,
    path: "/",
  });

  const redirectUri = `${requireEnv("NEXT_PUBLIC_APP_URL")}/api/oauth/calcom/callback`;
  try {
    return { ok: true, url: getAuthorizeUrl({ state, redirectUri }) };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to build authorize URL.",
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
