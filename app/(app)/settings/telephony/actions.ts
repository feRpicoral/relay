"use server";

import { z } from "zod";

import { requireAdmin } from "@/lib/auth/session";
import { connect, disconnect } from "@/lib/telephony/connection";
import { attachNumber, detachNumber, fullCleanup } from "@/lib/telephony/provisioning";

type Result = { ok: true } | { ok: false; error: string };

const ConnectSchema = z.object({
  // Twilio Account SIDs always start with "AC" followed by 32 hex chars.
  accountSid: z.string().regex(/^AC[a-f0-9]{32}$/i, "Account SID inválido (formato ACxxxxxxxx)."),
  // Twilio Client SID (the "SID" shown in the API Key creation dialog) starts
  // with "SK". Internally Twilio still calls this the API Key SID, but the
  // Console label is "Twilio Client SID".
  apiKeySid: z
    .string()
    .regex(/^SK[a-f0-9]{32}$/i, "Twilio Client SID inválido (formato SKxxxxxxxx)."),
  // Secret is a long opaque string. Don't try to validate format beyond length.
  apiKeySecret: z.string().min(20, "Secret muito curto."),
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
    // Twilio's RestException carries status, code, moreInfo, and a message.
    // We log the full thing so it lands in Vercel runtime logs for debugging,
    // and surface the most useful piece to the UI.
    console.error("[telephony] connectTwilioAction failed:", err);
    const e = err as { status?: number; code?: number; moreInfo?: string; message?: string };
    const message = e.message ?? String(err);
    if (e.status === 401 || /Authenticate|Unauthorized|Invalid Access Token/i.test(message)) {
      return {
        ok: false,
        error:
          "Twilio rejeitou as credenciais (401). Verifique se: (a) o Account SID é o da conta dona da API Key, (b) o Twilio Client SID começa com SK, (c) o Secret é o mostrado UMA vez na criação (não o auth token mestre).",
      };
    }
    if (e.code === 20003) {
      // 20003 also fires when a Standard key is used against a Main-only
      // endpoint (e.g. /Accounts/{sid}.json). We use phone-number listing
      // instead, but surface this hint just in case Twilio changes scope.
      return {
        ok: false,
        error:
          "API Key sem permissão pra acessar a conta. Confirme que ela é Standard (não Restricted) e foi criada na mesma conta do Account SID.",
      };
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
