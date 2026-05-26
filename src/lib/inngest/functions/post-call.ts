import Anthropic from "@anthropic-ai/sdk";
import type { CallOutcome } from "@prisma/client";
import { z } from "zod";

import { getPrisma } from "@/lib/db/client";
import { requireEnv } from "@/lib/env";
import { PROVIDER_VERSIONS } from "@/lib/voice/provider-versions";

import { inngest } from "../client";
import { nextLeadStateForOutcome } from "./campaign-lead-state";

const SummarySchema = z.object({
  summary: z.string().min(5).max(800),
  outcome: z.enum(["SCHEDULED", "QUALIFIED", "TRANSFERRED", "NOT_QUALIFIED", "NO_ANSWER", "OTHER"]),
  sentiment: z.enum(["POSITIVE", "NEUTRAL", "NEGATIVE", "MIXED"]),
  topics: z.array(z.string()).max(8),
});

const SUMMARY_TOOL_NAME = "submit_call_analysis";

/**
 * On `call/completed`, fetch the transcript and tool calls, ask Claude Sonnet to
 * produce a structured summary + outcome + sentiment + topics, and write the
 * result back to the Call row.
 *
 * The Sonnet vs Haiku split here is intentional: live calls use Haiku for
 * latency; offline analysis uses Sonnet for quality (per DECISIONS.md #3).
 */
export const postCallAnalysis = inngest.createFunction(
  { id: "post-call-analysis", retries: 3, triggers: [{ event: "call/completed" }] },
  async ({ event, step }) => {
    const { callId } = event.data;

    const call = await step.run("load-call", async () => {
      return getPrisma().call.findUnique({
        where: { id: callId },
        include: {
          transcripts: { orderBy: { startMs: "asc" } },
          toolCalls: { orderBy: { startedAt: "asc" } },
          agent: { select: { name: true, language: true } },
          campaignAttempt: {
            include: {
              lead: { select: { id: true, attempts: true } },
              campaign: { select: { maxAttempts: true, cooldownMinutes: true } },
            },
          },
        },
      });
    });
    if (!call) return { skipped: "call not found" };
    if (call.processedAt) return { skipped: "already processed" };

    if (call.transcripts.length === 0) {
      // Defer `processedAt` to the last step. `if (call.processedAt) return`
      // above is what gates the retry — if we set it here and the campaign
      // propagation that follows fails, the retry would see the row already
      // marked processed and exit without ever updating the lead.
      await step.run("mark-empty", async () => {
        await getPrisma().call.update({
          where: { id: callId },
          data: {
            outcome: "NO_ANSWER",
            summary: "Sem transcrição disponível.",
            sentiment: "NEUTRAL",
          },
        });
      });
      if (call.campaignAttempt) {
        await step.run("propagate-empty-to-campaign", async () => {
          await applyCampaignLeadTransition({
            attemptId: call.campaignAttempt!.id,
            leadId: call.campaignAttempt!.lead.id,
            outcome: "NO_ANSWER",
            priorAttempts: call.campaignAttempt!.lead.attempts,
            maxAttempts: call.campaignAttempt!.campaign.maxAttempts,
            cooldownMinutes: call.campaignAttempt!.campaign.cooldownMinutes,
          });
        });
      }
      await step.run("mark-empty-processed", async () => {
        await getPrisma().call.update({
          where: { id: callId },
          data: { processedAt: new Date() },
        });
      });
      return { ok: true, empty: true };
    }

    const result = await step.run("summarize", async () => {
      const anthropic = new Anthropic({ apiKey: requireEnv("ANTHROPIC_API_KEY") });
      const transcript = call.transcripts
        .map((t) => `${t.speaker === "AGENT" ? "Agente" : "Cliente"}: ${t.text}`)
        .join("\n");
      const toolsUsed = call.toolCalls
        .map((t) => `- ${t.name}(${JSON.stringify(t.inputJson)})`)
        .join("\n");

      const message = await anthropic.messages.create({
        model: PROVIDER_VERSIONS.anthropicSummary(),
        max_tokens: 1024,
        system:
          "Você é um analista de chamadas. Dada uma transcrição entre um agente de IA e um cliente, gera um resumo factual em português, classifica o desfecho, o sentimento, e extrai os tópicos. Não invente fatos. Use somente a transcrição fornecida.",
        tools: [
          {
            name: SUMMARY_TOOL_NAME,
            description: "Submit the structured call analysis.",
            input_schema: {
              type: "object",
              properties: {
                summary: { type: "string", description: "Resumo da chamada em 2-4 frases." },
                outcome: {
                  type: "string",
                  enum: [
                    "SCHEDULED",
                    "QUALIFIED",
                    "TRANSFERRED",
                    "NOT_QUALIFIED",
                    "NO_ANSWER",
                    "OTHER",
                  ],
                },
                sentiment: {
                  type: "string",
                  enum: ["POSITIVE", "NEUTRAL", "NEGATIVE", "MIXED"],
                },
                topics: { type: "array", items: { type: "string" }, maxItems: 8 },
              },
              required: ["summary", "outcome", "sentiment", "topics"],
            },
          },
        ],
        tool_choice: { type: "tool", name: SUMMARY_TOOL_NAME },
        messages: [
          {
            role: "user",
            content: `Agente: ${call.agent?.name ?? "-"}\n\nTranscrição:\n${transcript}\n\nFerramentas usadas:\n${toolsUsed || "(nenhuma)"}`,
          },
        ],
      });

      const block = message.content.find((b) => b.type === "tool_use");
      if (!block || block.type !== "tool_use") throw new Error("LLM did not call the tool.");
      return SummarySchema.parse(block.input);
    });

    // Persist the analytical fields, but defer `processedAt` to the very last
    // step. `if (call.processedAt) return` above is what gates retries — if we
    // mark processed here and the campaign propagation fails, the retry would
    // see the row already processed and exit without ever updating the lead,
    // leaving it permanently stuck in CALLING.
    await step.run("persist-summary", async () => {
      await getPrisma().call.update({
        where: { id: callId },
        data: {
          summary: result.summary,
          outcome: result.outcome,
          sentiment: result.sentiment,
          topics: result.topics,
        },
      });
    });

    if (call.campaignAttempt) {
      await step.run("propagate-to-campaign", async () => {
        await applyCampaignLeadTransition({
          attemptId: call.campaignAttempt!.id,
          leadId: call.campaignAttempt!.lead.id,
          outcome: result.outcome,
          priorAttempts: call.campaignAttempt!.lead.attempts,
          maxAttempts: call.campaignAttempt!.campaign.maxAttempts,
          cooldownMinutes: call.campaignAttempt!.campaign.cooldownMinutes,
        });
      });
    }

    await step.run("mark-processed", async () => {
      await getPrisma().call.update({
        where: { id: callId },
        data: { processedAt: new Date() },
      });
    });

    return { ok: true, ...result };
  },
);

interface ApplyTransitionInput {
  attemptId: string;
  leadId: string;
  outcome: CallOutcome;
  priorAttempts: number;
  maxAttempts: number;
  cooldownMinutes: number;
}

async function applyCampaignLeadTransition(input: ApplyTransitionInput): Promise<void> {
  const transition = nextLeadStateForOutcome({
    outcome: input.outcome,
    priorAttempts: input.priorAttempts,
    maxAttempts: input.maxAttempts,
    cooldownMinutes: input.cooldownMinutes,
  });
  await getPrisma().$transaction([
    getPrisma().campaignAttempt.update({
      where: { id: input.attemptId },
      data: { endedAt: new Date(), outcome: input.outcome },
    }),
    getPrisma().campaignLead.update({
      where: { id: input.leadId },
      data: {
        status: transition.status,
        outcome: transition.outcome,
        nextEligibleAt: transition.nextEligibleAt,
        reachedAt: transition.reachedAt,
      },
    }),
  ]);
}
