import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

import { getPrisma } from "@/lib/db/client";
import { envOr } from "@/lib/env";

import { inngest } from "../client";

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
 * latency; offline analysis uses Sonnet for quality (per DECISIONS.md §3).
 */
export const postCallAnalysis = inngest.createFunction(
  { id: "post-call-analysis", retries: 3 },
  { event: "call/completed" },
  async ({ event, step }) => {
    const { callId } = event.data;

    const call = await step.run("load-call", async () => {
      return getPrisma().call.findUnique({
        where: { id: callId },
        include: {
          transcripts: { orderBy: { startMs: "asc" } },
          toolCalls: { orderBy: { startedAt: "asc" } },
          agent: { select: { name: true, language: true } },
        },
      });
    });
    if (!call) return { skipped: "call not found" };
    if (call.processedAt) return { skipped: "already processed" };

    if (call.transcripts.length === 0) {
      await step.run("mark-empty", async () => {
        await getPrisma().call.update({
          where: { id: callId },
          data: {
            processedAt: new Date(),
            outcome: "NO_ANSWER",
            summary: "Sem transcrição disponível.",
            sentiment: "NEUTRAL",
          },
        });
      });
      return { ok: true, empty: true };
    }

    const result = await step.run("summarize", async () => {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });
      const transcript = call.transcripts
        .map((t) => `${t.speaker === "AGENT" ? "Agente" : "Cliente"}: ${t.text}`)
        .join("\n");
      const toolsUsed = call.toolCalls
        .map((t) => `- ${t.name}(${JSON.stringify(t.inputJson)})`)
        .join("\n");

      const model = envOr("ANTHROPIC_MODEL_SUMMARY", "claude-sonnet-4-6");

      const message = await anthropic.messages.create({
        model,
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
            content: `Agente: ${call.agent?.name ?? "—"}\n\nTranscrição:\n${transcript}\n\nFerramentas usadas:\n${toolsUsed || "(nenhuma)"}`,
          },
        ],
      });

      const block = message.content.find((b) => b.type === "tool_use");
      if (!block || block.type !== "tool_use") throw new Error("LLM did not call the tool.");
      return SummarySchema.parse(block.input);
    });

    await step.run("persist-summary", async () => {
      await getPrisma().call.update({
        where: { id: callId },
        data: {
          summary: result.summary,
          outcome: result.outcome,
          sentiment: result.sentiment,
          topics: result.topics,
          processedAt: new Date(),
        },
      });
    });

    return { ok: true, ...result };
  },
);
