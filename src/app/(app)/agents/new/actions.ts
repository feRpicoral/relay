"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/session";
import { DEFAULT_OPEN_HOURS, DEFAULT_TIMEZONE } from "@/lib/constants";
import { getDb } from "@/lib/db/with-org";

const Schema = z.object({
  name: z.string().trim().min(2).max(120),
  language: z.enum(["PT_BR", "EN_US"]),
  personaPrompt: z.string().trim().min(1).max(4000),
  greeting: z.string().max(280).default(""),
});

export interface CreateAgentFieldErrors {
  name?: string;
  personaPrompt?: string;
}

export type CreateAgentResult =
  | { ok: true; agentId: string }
  | { ok: false; fieldErrors: CreateAgentFieldErrors };

export async function createAgentAction(input: z.infer<typeof Schema>): Promise<CreateAgentResult> {
  const t = await getTranslations("agents.new.fieldErrors");
  const session = await requireAdmin();
  const parsed = Schema.safeParse(input);
  if (!parsed.success) {
    const flattened = parsed.error.flatten().fieldErrors;
    return {
      ok: false,
      fieldErrors: {
        ...(flattened.name ? { name: t("nameRequired") } : {}),
        ...(flattened.personaPrompt ? { personaPrompt: t("personaRequired") } : {}),
      },
    };
  }

  const db = getDb(session.orgId);

  // voiceId intentionally empty: the live Cartesia catalog is fetched in the
  // agent settings page and the operator picks a real UUID there. Hardcoding
  // a default would 500 the worker the moment the catalog drifts. The agent
  // starts disabled so it can't be attached/tested before a voice is picked —
  // updateAgentSettingsAction + startTestCall + attachNumber refuse otherwise.
  const agent = await db.agent.create({
    data: {
      orgId: session.orgId,
      name: parsed.data.name,
      language: parsed.data.language,
      personaPrompt: parsed.data.personaPrompt,
      greeting: parsed.data.greeting,
      voiceId: "",
      enabled: false,
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
