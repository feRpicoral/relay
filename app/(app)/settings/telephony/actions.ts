"use server";

import { z } from "zod";

import { requireAdmin } from "@/lib/auth/session";
import { connect, disconnect } from "@/lib/telephony/connection";
import { attachNumber, detachNumber, fullCleanup } from "@/lib/telephony/provisioning";

type Result = { ok: true } | { ok: false; error: string };

const ConnectSchema = z.object({
  // Twilio Account SIDs always start with "AC" followed by 32 hex chars.
  accountSid: z.string().regex(/^AC[a-f0-9]{32}$/i, "Account SID inválido (formato ACxxxxxxxx)."),
  // API Key SIDs start with "SK".
  apiKeySid: z.string().regex(/^SK[a-f0-9]{32}$/i, "API Key SID inválido (formato SKxxxxxxxx)."),
  // Secret is a long opaque string. Don't try to validate format beyond length.
  apiKeySecret: z.string().min(20, "API Key Secret muito curto."),
});

export async function connectTwilioAction(input: z.infer<typeof ConnectSchema>): Promise<Result> {
  const session = await requireAdmin();
  const parsed = ConnectSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Entrada inválida." };
  }

  try {
    await connect(session.orgId, parsed.data);
  } catch (err) {
    // Twilio errors come through as Error with .status / .code. Surface the
    // human-readable message when available.
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("Authenticate")) {
      return { ok: false, error: "Credenciais Twilio inválidas. Confirme Account SID + API Key." };
    }
    return { ok: false, error: `Falha ao validar com Twilio: ${message}` };
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
  return { ok: true };
}

const AttachSchema = z.object({
  twilioSid: z.string().regex(/^PN[a-f0-9]{32}$/i, "Twilio number SID inválido."),
  agentId: z.string().uuid(),
  label: z.string().max(120).optional(),
});

export async function attachNumberAction(input: z.infer<typeof AttachSchema>): Promise<Result> {
  const session = await requireAdmin();
  const parsed = AttachSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Entrada inválida." };
  }
  try {
    await attachNumber({
      orgId: session.orgId,
      twilioSid: parsed.data.twilioSid,
      agentId: parsed.data.agentId as Parameters<typeof attachNumber>[0]["agentId"],
      label: parsed.data.label,
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
  return { ok: true };
}

const DetachSchema = z.object({ phoneNumberId: z.string().uuid() });

export async function detachNumberAction(input: z.infer<typeof DetachSchema>): Promise<Result> {
  const session = await requireAdmin();
  const parsed = DetachSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Entrada inválida." };
  try {
    await detachNumber(session.orgId, parsed.data.phoneNumberId);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
  return { ok: true };
}
