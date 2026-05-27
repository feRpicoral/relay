"use server";

import { getTranslations } from "next-intl/server";
import { z } from "zod";

import { requireSession } from "@/lib/auth/session";
import { asAgentId } from "@/lib/db/types";
import type { Result } from "@/lib/types/result";
import { AgentVoiceNotConfiguredError, startTestCall } from "@/lib/voice/test-call";

const Schema = z.object({ agentId: z.string().uuid() });

export async function startTestCallAction(
  input: z.infer<typeof Schema>,
): Promise<Result<{ token: string; livekitUrl: string; callId: string; roomName: string }>> {
  const t = await getTranslations("agents.detail.errors");
  const session = await requireSession();
  const parsed = Schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: t("invalidInput") };

  try {
    const result = await startTestCall({
      orgId: session.orgId,
      agentId: asAgentId(parsed.data.agentId),
      testerEmail: session.email,
    });
    return { ok: true, ...result };
  } catch (err) {
    if (err instanceof AgentVoiceNotConfiguredError) {
      return { ok: false, error: t("voiceRequiredToEnable") };
    }
    return { ok: false, error: err instanceof Error ? err.message : t("testCallFailed") };
  }
}
