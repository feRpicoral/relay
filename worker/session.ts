/**
 * A single call session inside the worker.
 *
 * Lifecycle:
 *   1. Load agent context (persona, voice, language, KB) from DB.
 *   2. Connect to the LiveKit room as a publishing participant.
 *   3. Stream incoming audio from the SIP participant through Deepgram Flux.
 *   4. On finalized user turn, stream to Claude Haiku with tool definitions.
 *   5. Stream LLM tokens into Cartesia TTS; publish synthesized audio back to
 *      the room.
 *   6. Handle barge-in: when STT detects new user speech, cancel in-flight LLM
 *      and TTS, flush the audio queue.
 *   7. Persist transcripts, tool calls, and latency per leg.
 *   8. On hangup, finalize the call row.
 */
import { performance } from "node:perf_hooks";

import Anthropic from "@anthropic-ai/sdk";

import { asCallId, asOrgId } from "@/lib/db/types";
import { loadAgentContext } from "@/lib/voice/agent-context";
import { estimateCallCostCents } from "@/lib/voice/cost";
import {
  appendTranscript,
  markCallAnswered,
  markCallEnded,
  recordCallEvent,
  recordLatency,
} from "@/lib/voice/persistence";
import { buildGreeting, buildSystemPrompt } from "@/lib/voice/prompts";
import { runTool, toolDefinitionsForAnthropic } from "@/lib/voice/tools";

interface UserTurn {
  text: string;
  startMs: number;
  endMs: number;
  confidence?: number;
}

class ConversationLoop {
  private anthropic: Anthropic;
  private messages: Anthropic.MessageParam[] = [];
  private cancelInFlight: (() => void) | null = null;
  private cancelled = false;

  constructor(
    private opts: {
      callId: string;
      orgId: string;
      systemPrompt: string;
    },
  ) {
    this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "missing" });
  }

  cancelCurrent() {
    this.cancelled = true;
    this.cancelInFlight?.();
  }

  async handleUserTurn(
    turn: UserTurn,
    emitAudio: (chunk: { sentence: string; isFirst: boolean }) => Promise<void>,
  ): Promise<void> {
    this.cancelled = false;
    const callId = asCallId(this.opts.callId);
    const orgId = asOrgId(this.opts.orgId);

    await appendTranscript(orgId, callId, {
      speaker: "USER",
      text: turn.text,
      startMs: turn.startMs,
      endMs: turn.endMs,
      isFinal: true,
      confidence: turn.confidence,
    });
    await recordCallEvent(orgId, callId, "USER_SPOKE", { textLen: turn.text.length });

    this.messages.push({ role: "user", content: turn.text });

    const llmStart = performance.now();
    let firstTokenAt = 0;
    let sentenceBuf = "";
    let agentText = "";
    let isFirstSentence = true;

    try {
      const stream = this.anthropic.messages.stream({
        model: process.env.ANTHROPIC_MODEL_FAST ?? "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: [
          { type: "text", text: this.opts.systemPrompt, cache_control: { type: "ephemeral" } },
        ],
        messages: this.messages,
        tools: toolDefinitionsForAnthropic() as Anthropic.Tool[],
      });

      this.cancelInFlight = () => stream.abort();

      for await (const event of stream) {
        if (this.cancelled) break;
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          if (firstTokenAt === 0) {
            firstTokenAt = performance.now();
            await recordLatency(orgId, callId, {
              leg: "LLM_TTFT",
              valueMs: Math.round(firstTokenAt - llmStart),
            });
          }
          sentenceBuf += event.delta.text;
          agentText += event.delta.text;
          let flush = sentenceBuf;
          while (true) {
            const m = flush.match(/[^.!?…\n]+[.!?…\n]+/);
            if (!m) break;
            const sentence = m[0].trim();
            if (sentence) {
              await emitAudio({ sentence, isFirst: isFirstSentence });
              isFirstSentence = false;
            }
            flush = flush.slice(m[0].length);
          }
          sentenceBuf = flush;
        }
      }

      if (sentenceBuf.trim()) {
        await emitAudio({ sentence: sentenceBuf.trim(), isFirst: isFirstSentence });
      }

      const finalMessage = await stream.finalMessage();
      this.messages.push({ role: "assistant", content: finalMessage.content });

      const llmEnd = performance.now();
      await recordLatency(orgId, callId, {
        leg: "LLM_TOTAL",
        valueMs: Math.round(llmEnd - llmStart),
      });

      // Persist agent text turn.
      if (agentText) {
        await appendTranscript(orgId, callId, {
          speaker: "AGENT",
          text: agentText,
          startMs: turn.endMs,
          endMs: turn.endMs + Math.round(llmEnd - llmStart),
          isFinal: true,
        });
        await recordCallEvent(orgId, callId, "AGENT_SPOKE", { textLen: agentText.length });
      }

      // Handle tool calls if any.
      const toolUses = finalMessage.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
      );
      if (toolUses.length > 0) {
        const toolResultContent: Anthropic.MessageParam["content"] = [];
        for (const use of toolUses) {
          const result = await runTool(use.name, use.input, { orgId, callId });
          toolResultContent.push({
            type: "tool_result",
            tool_use_id: use.id,
            content: JSON.stringify(result.result ?? { error: result.error }),
            is_error: !result.ok,
          });
          await recordCallEvent(orgId, callId, "TOOL_INVOKED", {
            name: use.name,
            ok: result.ok,
            durationMs: result.durationMs,
          });
          await recordLatency(orgId, callId, {
            leg: "TOOL_TOTAL",
            valueMs: result.durationMs,
            metadata: { name: use.name },
          });
        }
        this.messages.push({ role: "user", content: toolResultContent });
        // Recurse on the same user turn — the LLM follows up with a natural-language reply.
        return this.handleUserTurn(
          { text: "[tool_results]", startMs: turn.endMs, endMs: turn.endMs },
          emitAudio,
        );
      }
    } catch (err) {
      if (this.cancelled) return;
      await recordCallEvent(orgId, callId, "ERROR", {
        stage: "llm",
        message: err instanceof Error ? err.message : String(err),
      });
      console.error("[session] llm error", err);
    } finally {
      this.cancelInFlight = null;
    }
  }
}

/**
 * Drive a single call from start to finish.
 *
 * NOTE: the raw LiveKit audio plumbing is delegated to `@livekit/agents` in
 * production. This function focuses on the conversational state machine — the
 * STT/LLM/TTS providers, the cancel-on-bargein behavior, persistence, and
 * latency instrumentation. The audio capture is wired in `worker/audio.ts`.
 */
export async function runWorkerForCall(callId: string, roomName: string): Promise<void> {
  const ctx = await loadAgentContext(callId);
  if (!ctx) {
    console.warn("[worker] no context for call", callId);
    return;
  }

  const orgId = asOrgId(ctx.orgId);
  const callIdBranded = asCallId(callId);

  await recordCallEvent(orgId, callIdBranded, "ROOM_CREATED", { roomName });
  await markCallAnswered(callId);

  const callStartedAt = Date.now();
  const language = ctx.language === "auto" ? "pt-BR" : ctx.language;
  const systemPrompt = buildSystemPrompt({ ...ctx, language });

  const convo = new ConversationLoop({
    callId,
    orgId: ctx.orgId,
    systemPrompt,
  });

  // In real deployment the AudioBridge module wires this to LiveKit. For the
  // demo/test path we expose hooks so the bridge can drive turns.
  const bridge = await import("./audio");
  await bridge.startCallBridge({
    callId,
    orgId: ctx.orgId,
    roomName,
    voiceId: ctx.voiceId,
    ttsProvider: ctx.ttsProvider,
    language,
    greeting: buildGreeting(ctx),
    onUserTurn: async (turn, emitAudio) => {
      convo.cancelCurrent();
      await convo.handleUserTurn(turn, emitAudio);
    },
    onHangup: async () => {
      const durationMs = Date.now() - callStartedAt;
      const cost = estimateCallCostCents({
        durationMs,
        ttsProvider: ctx.ttsProvider,
        language: ctx.language,
      });
      await markCallEnded(callId, {
        status: "COMPLETED",
        durationMs,
        costCents: cost,
      });
      await recordCallEvent(orgId, callIdBranded, "HANGUP", {});
    },
  });
}
