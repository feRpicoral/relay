"use server";

import { z } from "zod";

import { requireAdmin } from "@/lib/auth/session";
import { connect, disconnect } from "@/lib/telephony/connection";

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
  await disconnect(session.orgId);
  return { ok: true };
}
