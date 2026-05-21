"use server";

import { z } from "zod";

import { requireSession } from "@/lib/auth/session";
import { asAgentId } from "@/lib/db/types";
import type { Result } from "@/lib/types/result";
import { startTestCall } from "@/lib/voice/test-call";

const Schema = z.object({ agentId: z.string().uuid() });

export async function startTestCallAction(
  input: z.infer<typeof Schema>,
): Promise<Result<{ token: string; livekitUrl: string; callId: string; roomName: string }>> {
  const session = await requireSession();
  const parsed = Schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Entrada inválida." };

  try {
    const result = await startTestCall({
      orgId: session.orgId,
      agentId: asAgentId(parsed.data.agentId),
      testerEmail: session.email,
    });
    return { ok: true, ...result };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Falhou." };
  }
}
