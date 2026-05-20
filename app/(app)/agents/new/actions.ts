"use server";

import { z } from "zod";

import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db/with-org";
import { DEFAULT_VOICE_EN_US, DEFAULT_VOICE_PT_BR } from "@/lib/voice/voices";

const Schema = z.object({
  name: z.string().min(2).max(120),
  language: z.enum(["PT_BR", "EN_US"]),
  personaPrompt: z.string().max(4000).default(""),
  greeting: z.string().max(280).default(""),
});

type Result = { ok: true; agentId: string } | { ok: false; error: string };

export async function createAgentAction(input: z.infer<typeof Schema>): Promise<Result> {
  const session = await requireAdmin();
  const parsed = Schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };

  const db = getDb(session.orgId);
  const voice = parsed.data.language === "EN_US" ? DEFAULT_VOICE_EN_US : DEFAULT_VOICE_PT_BR;

  const agent = await db.agent.create({
    data: {
      orgId: session.orgId,
      name: parsed.data.name,
      language: parsed.data.language,
      personaPrompt: parsed.data.personaPrompt,
      greeting: parsed.data.greeting,
      voiceId: voice,
      ttsProvider: "CARTESIA",
      businessHours: {
        timezone: "America/Sao_Paulo",
        monday: { open: "08:00", close: "18:00" },
        tuesday: { open: "08:00", close: "18:00" },
        wednesday: { open: "08:00", close: "18:00" },
        thursday: { open: "08:00", close: "18:00" },
        friday: { open: "08:00", close: "18:00" },
        saturday: null,
        sunday: null,
      },
    },
  });
  return { ok: true, agentId: agent.id };
}
