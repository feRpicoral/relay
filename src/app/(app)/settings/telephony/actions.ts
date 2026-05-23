"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/session";
import { asAgentId } from "@/lib/db/types";
import { connect, disconnect } from "@/lib/telephony/connection";
import { attachNumber, detachNumber, fullCleanup } from "@/lib/telephony/provisioning";
import type { Result } from "@/lib/types/result";

const ConnectSchema = z.object({
  // Twilio Account SIDs always start with "AC" followed by 32 hex chars.
  accountSid: z.string().regex(/^AC[a-f0-9]{32}$/i, "INVALID_ACCOUNT_SID"),
  // Twilio Client SID (the "SID" shown in the API Key creation dialog) starts
  // with "SK". Internally Twilio still calls this the API Key SID, but the
  // Console label is "Twilio Client SID".
  apiKeySid: z.string().regex(/^SK[a-f0-9]{32}$/i, "INVALID_API_KEY_SID"),
  // Secret is a long opaque string. Don't try to validate format beyond length.
  apiKeySecret: z.string().min(20, "SECRET_TOO_SHORT"),
});

export async function connectTwilioAction(input: z.infer<typeof ConnectSchema>): Promise<Result> {
  const t = await getTranslations("settings.telephony.connect");
  const session = await requireAdmin();
  const parsed = ConnectSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: t("toastFailed") };
  }

  try {
    await connect(session.orgId, parsed.data);
    revalidatePath("/settings/telephony");
  } catch (err) {
    // Twilio's RestException carries status, code, moreInfo, and a message.
    // We log the full thing so it lands in Vercel runtime logs for debugging,
    // and surface the most useful piece to the UI.
    console.error("[telephony] connectTwilioAction failed:", err);
    const e = err as { status?: number; code?: number; moreInfo?: string; message?: string };
    const message = e.message ?? String(err);
    if (e.status === 401 || /Authenticate|Unauthorized|Invalid Access Token/i.test(message)) {
      return { ok: false, error: t("toastFailed") };
    }
    if (e.code === 20003) {
      // 20003 also fires when a Standard key is used against a Main-only
      // endpoint (e.g. /Accounts/{sid}.json).
      return { ok: false, error: t("toastFailed") };
    }
    return {
      ok: false,
      error: `Twilio: ${message}${e.moreInfo ? ` (${e.moreInfo})` : ""}`,
    };
  }
  return { ok: true };
}

export async function disconnectTwilioAction(): Promise<Result> {
  const session = await requireAdmin();
  // Tear down the per-org resources first (numbers in trunk, allow-list,
  // LiveKit outbound trunk). Then drop the credentials.
  try {
    await fullCleanup(session.orgId);
  } catch (err) {
    // Cleanup is best-effort; if Twilio is unreachable or creds were already
    // revoked we still want to drop the local row so the user can reconnect.
    console.warn("[telephony] fullCleanup partial failure on disconnect:", err);
  }
  await disconnect(session.orgId);
  revalidatePath("/settings/telephony");
  return { ok: true };
}

const AttachSchema = z.object({
  twilioSid: z.string().regex(/^PN[a-f0-9]{32}$/i, "INVALID_NUMBER_SID"),
  agentId: z.string().uuid(),
  label: z.string().max(120).optional(),
});

export async function attachNumberAction(input: z.infer<typeof AttachSchema>): Promise<Result> {
  const t = await getTranslations("settings.telephony.connect");
  const session = await requireAdmin();
  const parsed = AttachSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: t("toastFailed") };
  }
  try {
    await attachNumber({
      orgId: session.orgId,
      twilioSid: parsed.data.twilioSid,
      agentId: asAgentId(parsed.data.agentId),
      label: parsed.data.label,
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
  revalidatePath("/settings/telephony");
  return { ok: true };
}

const DetachSchema = z.object({ phoneNumberId: z.string().uuid() });

export async function detachNumberAction(input: z.infer<typeof DetachSchema>): Promise<Result> {
  const t = await getTranslations("settings.telephony.connect");
  const session = await requireAdmin();
  const parsed = DetachSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: t("toastFailed") };
  try {
    await detachNumber(session.orgId, parsed.data.phoneNumberId);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
  revalidatePath("/settings/telephony");
  return { ok: true };
}
