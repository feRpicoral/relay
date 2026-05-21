"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/session";
import { DEFAULT_OPEN_HOURS, DEFAULT_TIMEZONE } from "@/lib/constants";
import { getDb } from "@/lib/db/with-org";

const Schema = z.object({
  name: z.string().trim().min(2).max(120),
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

  // voiceId intentionally empty: the live Cartesia catalog is fetched in the
  // agent settings page and the operator picks a real UUID there. Hardcoding
  // a default would 500 the worker the moment the catalog drifts.
  const agent = await db.agent.create({
    data: {
      orgId: session.orgId,
      name: parsed.data.name,
      language: parsed.data.language,
      personaPrompt: parsed.data.personaPrompt,
      greeting: parsed.data.greeting,
      voiceId: "",
      ttsProvider: "CARTESIA",
      businessHours: {
        timezone: DEFAULT_TIMEZONE,
        monday: DEFAULT_OPEN_HOURS,
        tuesday: DEFAULT_OPEN_HOURS,
        wednesday: DEFAULT_OPEN_HOURS,
        thursday: DEFAULT_OPEN_HOURS,
        friday: DEFAULT_OPEN_HOURS,
        saturday: null,
        sunday: null,
      },
    },
  });
  revalidatePath("/agents");
  return { ok: true, agentId: agent.id };
}
