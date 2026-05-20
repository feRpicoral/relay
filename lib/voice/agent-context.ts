import "server-only";

import { getPrisma } from "@/lib/db/client";

import { type AgentContext, BusinessHoursSchema } from "./types";

/**
 * Load the agent context for a given call by joining Call → Agent → KnowledgeDoc.
 * Used by the worker at call start.
 */
export async function loadAgentContext(callId: string): Promise<AgentContext | null> {
  const prisma = getPrisma();
  const call = await prisma.call.findUnique({
    where: { id: callId },
    include: {
      agent: {
        include: {
          knowledgeDocs: {
            orderBy: { createdAt: "asc" },
            take: 20,
          },
        },
      },
    },
  });
  if (!call || !call.agent || !call.agent.enabled) return null;

  const businessHoursParsed = BusinessHoursSchema.safeParse(call.agent.businessHours);
  const businessHours = businessHoursParsed.success
    ? businessHoursParsed.data
    : { timezone: "America/Sao_Paulo" };

  return {
    callId: call.id,
    orgId: call.orgId,
    agentId: call.agent.id,
    language:
      call.agent.language === "EN_US" ? "en-US" : call.agent.language === "AUTO" ? "auto" : "pt-BR",
    ttsProvider: call.agent.ttsProvider === "ELEVENLABS" ? "elevenlabs" : "cartesia",
    voiceId: call.agent.voiceId,
    personaPrompt: call.agent.personaPrompt,
    greeting: call.agent.greeting,
    knowledgeChunks: call.agent.knowledgeDocs.map((d) => `${d.title}\n${d.body}`),
    businessHours,
    fallbackTransferE164: call.agent.fallbackTransferE164,
    callerE164: call.callerE164,
    calleeE164: call.calleeE164,
  };
}

/**
 * Resolve which organization + agent owns a given inbound phone number. The
 * worker calls this at SIP-ingress time before creating a Call row.
 */
export async function resolvePhoneNumber(e164: string) {
  const prisma = getPrisma();
  return prisma.phoneNumber.findUnique({
    where: { e164 },
    include: { agent: true, organization: true },
  });
}
