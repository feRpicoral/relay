/**
 * Relay agent worker, the voice pipeline.
 *
 * Joins a LiveKit room (typically created by an inbound SIP call from the
 * configured trunk, or by the in-dashboard test-call feature), resolves the
 * tenant from SIP attributes, then runs a streaming STT -> LLM -> TTS pipeline
 * via @livekit/agents.
 *
 * Run with `yarn worker:start` (production) or `yarn worker:dev` (watch).
 */
import { fileURLToPath } from "node:url";

import {
  cli,
  defineAgent,
  type JobContext,
  llm as llmModule,
  voice,
  WorkerOptions,
} from "@livekit/agents";
import * as cartesia from "@livekit/agents-plugin-cartesia";
import * as deepgram from "@livekit/agents-plugin-deepgram";
import * as elevenlabs from "@livekit/agents-plugin-elevenlabs";
import * as openai from "@livekit/agents-plugin-openai";
import * as silero from "@livekit/agents-plugin-silero";
import { z } from "zod";

import { calcom } from "@/lib/calendar/calcom";
import { asCallId, asOrgId } from "@/lib/db/types";
import { envOr, requireEnv } from "@/lib/env";
import { loadAgentContext, resolvePhoneNumber } from "@/lib/voice/agent-context";
import { estimateCallCostCents } from "@/lib/voice/cost";
import { getSipClient } from "@/lib/voice/livekit";
import {
  appendTranscript,
  createInboundCall,
  markCallAnswered,
  markCallEnded,
  recordCallEvent,
  recordLatency,
  recordToolCall,
} from "@/lib/voice/persistence";
import { triggerPostCallAnalysis } from "@/lib/voice/post-call-trigger";
import { buildGreeting, buildSystemPrompt } from "@/lib/voice/prompts";
import { lookupKb } from "@/lib/voice/tools/lookup-kb";

const { AgentSessionEventTypes } = voice;

export default defineAgent({
  entry: async (ctx: JobContext) => {
    await ctx.connect();

    // Resolve tenant + agent
    // For an inbound SIP call, LiveKit attaches SIP attributes to the
    // participant. For the test-call feature, the room metadata carries the
    // pre-created callId. We support both paths.
    const participant = await ctx.waitForParticipant();

    const attrs = participant.attributes ?? {};
    const sipFrom = attrs["sip.phoneNumber"] ?? attrs["sip.from"] ?? "";
    const sipTo = attrs["sip.trunkPhoneNumber"] ?? attrs["sip.to"] ?? "";

    let callId: string | null = null;
    let orgId: string | null = null;

    if (sipTo) {
      const phone = await resolvePhoneNumber(sipTo);
      if (!phone?.agentId) {
        console.warn(`[agent] unknown inbound number ${sipTo}`);
        await ctx.room.disconnect();
        return;
      }
      const created = await createInboundCall({
        orgId: phone.orgId,
        agentId: phone.agentId,
        phoneNumberId: phone.id,
        callerE164: sipFrom,
        calleeE164: sipTo,
        livekitRoomName: ctx.room.name,
      });
      callId = created.callId;
      orgId = created.orgId;
    } else {
      // Test-call path: room.metadata is JSON {"callId":"...","orgId":"..."}.
      try {
        const meta = JSON.parse(ctx.room.metadata ?? "{}") as {
          callId?: string;
          orgId?: string;
        };
        if (meta.callId && meta.orgId) {
          callId = meta.callId;
          orgId = meta.orgId;
        }
      } catch {
        // Not JSON, fall through to abort.
      }
      if (!callId || !orgId) {
        console.warn(`[agent] no SIP attrs and no room metadata; disconnecting`);
        await ctx.room.disconnect();
        return;
      }
    }

    const agentCtx = await loadAgentContext(callId);
    if (!agentCtx) {
      console.warn(`[agent] missing context for call ${callId}`);
      await ctx.room.disconnect();
      return;
    }

    const callIdBranded = asCallId(callId);
    const orgIdBranded = asOrgId(orgId);

    await markCallAnswered(callId);
    await recordCallEvent(orgIdBranded, callIdBranded, "ROOM_CREATED", {
      roomName: ctx.room.name,
    });

    const language = agentCtx.language === "auto" ? "pt-BR" : agentCtx.language;
    const systemPrompt = buildSystemPrompt({ ...agentCtx, language });
    const callStartedAt = Date.now();

    // Tools
    const tools = {
      check_availability: llmModule.tool({
        description:
          "Check available appointment slots within a date range. Returns up to 5 candidate slots.",
        parameters: z.object({
          from: z.string().describe("ISO 8601 datetime of the earliest acceptable slot"),
          to: z.string().describe("ISO 8601 datetime of the latest acceptable slot"),
          durationMin: z.number().int().positive().describe("Appointment length in minutes"),
        }),
        async execute({ from, to, durationMin }) {
          const startedAt = new Date();
          try {
            const slots = await calcom.getAvailableSlots({
              orgId: orgIdBranded,
              fromIso: from,
              toIso: to,
              durationMin,
            });
            const output = { slots: slots.slice(0, 5) };
            const endedAt = new Date();
            await recordToolCall(orgIdBranded, callIdBranded, {
              name: "check_availability",
              inputJson: { from, to, durationMin },
              outputJson: output,
              startedAt,
              endedAt,
              durationMs: endedAt.getTime() - startedAt.getTime(),
            });
            return output;
          } catch (err) {
            const endedAt = new Date();
            await recordToolCall(orgIdBranded, callIdBranded, {
              name: "check_availability",
              inputJson: { from, to, durationMin },
              errorMessage: err instanceof Error ? err.message : String(err),
              startedAt,
              endedAt,
              durationMs: endedAt.getTime() - startedAt.getTime(),
            });
            throw err;
          }
        },
      }),

      book_appointment: llmModule.tool({
        description: "Book an appointment at the given slot. Returns a confirmation id.",
        parameters: z.object({
          slotIso: z.string(),
          durationMin: z.number().int().positive(),
          patientName: z.string().min(2).max(120),
          patientPhone: z.string().min(8).max(20),
          reason: z.string().max(280).optional(),
        }),
        async execute(input) {
          const startedAt = new Date();
          try {
            const booking = await calcom.bookAppointment({
              orgId: orgIdBranded,
              slotIso: input.slotIso,
              durationMin: input.durationMin,
              patientName: input.patientName,
              patientPhone: input.patientPhone,
              reason: input.reason,
            });
            const output = { confirmationId: booking.id, status: booking.status };
            const endedAt = new Date();
            await recordToolCall(orgIdBranded, callIdBranded, {
              name: "book_appointment",
              inputJson: input,
              outputJson: output,
              startedAt,
              endedAt,
              durationMs: endedAt.getTime() - startedAt.getTime(),
            });
            return output;
          } catch (err) {
            const endedAt = new Date();
            await recordToolCall(orgIdBranded, callIdBranded, {
              name: "book_appointment",
              inputJson: input,
              errorMessage: err instanceof Error ? err.message : String(err),
              startedAt,
              endedAt,
              durationMs: endedAt.getTime() - startedAt.getTime(),
            });
            throw err;
          }
        },
      }),

      lookup_kb: llmModule.tool({
        description:
          "Search the business knowledge base (FAQ, hours, policies). Use BEFORE answering any question not in your context.",
        parameters: z.object({ query: z.string().min(2).max(500) }),
        async execute({ query }) {
          const startedAt = new Date();
          const chunks = await lookupKb(orgIdBranded, query);
          const endedAt = new Date();
          await recordToolCall(orgIdBranded, callIdBranded, {
            name: "lookup_kb",
            inputJson: { query },
            outputJson: { chunks },
            startedAt,
            endedAt,
            durationMs: endedAt.getTime() - startedAt.getTime(),
          });
          return { chunks };
        },
      }),

      transfer_to_human: llmModule.tool({
        description:
          "Transfer the call to the human fallback number. Use only when you cannot help or the caller explicitly asks for a person.",
        parameters: z.object({ reason: z.string().min(2).max(280) }),
        async execute({ reason }) {
          const startedAt = new Date();
          await recordCallEvent(orgIdBranded, callIdBranded, "TRANSFER_REQUESTED", { reason });
          const transferTo = agentCtx.fallbackTransferE164;
          if (!transferTo) {
            const endedAt = new Date();
            await recordToolCall(orgIdBranded, callIdBranded, {
              name: "transfer_to_human",
              inputJson: { reason },
              errorMessage: "No fallback transfer number configured for this agent.",
              startedAt,
              endedAt,
              durationMs: endedAt.getTime() - startedAt.getTime(),
            });
            return {
              ok: false,
              error: "no_fallback_number",
              message:
                "I'd transfer you, but no human number is configured. Please call back during business hours.",
            };
          }
          const sipHost = agentCtx.transferSipDomain;
          if (!sipHost) {
            const endedAt = new Date();
            await recordToolCall(orgIdBranded, callIdBranded, {
              name: "transfer_to_human",
              inputJson: { reason },
              errorMessage:
                "Org has no Twilio trunk domain. Connect Twilio in Settings before enabling transfers.",
              startedAt,
              endedAt,
              durationMs: endedAt.getTime() - startedAt.getTime(),
            });
            return {
              ok: false,
              error: "sip_host_not_configured",
              message:
                "I can't transfer right now, the system isn't fully configured. Please call back later.",
            };
          }
          try {
            const identity = participant.identity ?? "";
            const room = ctx.room.name ?? "";
            if (!identity || !room) {
              throw new Error("Missing participant identity or room name for transfer.");
            }
            // Defense-in-depth: validate both halves of the SIP URI before
            // building it. DB-stored values are trusted at write-time but we
            // do not want a corrupted `fallbackTransferE164` or `twilioTrunkDomain`
            // to redirect calls to an attacker-controlled host.
            if (!/^\+[1-9]\d{6,17}$/.test(transferTo)) {
              throw new Error(`Invalid E.164 for transfer: ${transferTo}`);
            }
            if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(sipHost)) {
              throw new Error(`Invalid SIP host for transfer: ${sipHost}`);
            }
            await getSipClient().transferSipParticipant(
              room,
              identity,
              `sip:${transferTo}@${sipHost}`,
              { playDialtone: false },
            );
            const endedAt = new Date();
            await recordToolCall(orgIdBranded, callIdBranded, {
              name: "transfer_to_human",
              inputJson: { reason },
              outputJson: { transferToE164: transferTo },
              startedAt,
              endedAt,
              durationMs: endedAt.getTime() - startedAt.getTime(),
            });
            return { ok: true, transferToE164: transferTo };
          } catch (err) {
            const endedAt = new Date();
            const message = err instanceof Error ? err.message : String(err);
            await recordToolCall(orgIdBranded, callIdBranded, {
              name: "transfer_to_human",
              inputJson: { reason },
              errorMessage: message,
              startedAt,
              endedAt,
              durationMs: endedAt.getTime() - startedAt.getTime(),
            });
            return { ok: false, error: "transfer_failed", message };
          }
        },
      }),
    };

    // Pipeline.
    //
    // We deliberately use deepgram.STT (V1, /v1/listen) rather than STTv2
    // (Flux). STTv2 only accepts flux-general-en or flux-general-multi —
    // passing nova-3 fails the WebSocket handshake with a generic 400. Nova-3
    // is the current Deepgram flagship for low-latency streaming and supports
    // pt-BR natively. The V1 class also exposes interimResults/endpointing
    // params that AgentSession's VAD-driven turn loop expects.
    const stt = new deepgram.STT({
      apiKey: requireEnv("DEEPGRAM_API_KEY"),
      model: envOr("DEEPGRAM_MODEL", "nova-3") as deepgram.STTOptions["model"],
      language: language === "pt-BR" ? "pt-BR" : "en-US",
    });

    const llm = new openai.LLM({
      apiKey: requireEnv("ANTHROPIC_API_KEY"),
      baseURL: "https://api.anthropic.com/v1/",
      model: envOr("ANTHROPIC_MODEL_FAST", "claude-haiku-4-5-20251001"),
    });

    const tts =
      agentCtx.ttsProvider === "elevenlabs"
        ? new elevenlabs.TTS({
            apiKey: requireEnv("ELEVENLABS_API_KEY"),
            voiceId: agentCtx.voiceId,
            model: "eleven_flash_v2_5",
            languageCode: language === "pt-BR" ? "pt" : "en",
          })
        : new cartesia.TTS({
            apiKey: requireEnv("CARTESIA_API_KEY"),
            model: envOr("CARTESIA_MODEL", "sonic-3"),
            voice: agentCtx.voiceId,
            language: language === "pt-BR" ? "pt" : "en",
          });

    const vad = await silero.VAD.load();

    const session = new voice.AgentSession({
      stt,
      llm,
      tts,
      vad,
    });

    const agent = new voice.Agent({
      instructions: systemPrompt,
      tools,
    });

    // Observability hooks
    // Persist every finalized user/agent turn into our DB.
    session.on(AgentSessionEventTypes.ConversationItemAdded, (event) => {
      const item = event.item as unknown as
        | { role?: string; textContent?: string; createdAt?: number }
        | undefined;
      if (!item?.role || !item.textContent) return;
      const speaker = item.role === "assistant" ? "AGENT" : item.role === "user" ? "USER" : null;
      if (!speaker) return;
      const ts = item.createdAt ?? Date.now();
      const offsetMs = Math.max(0, ts - callStartedAt);
      void appendTranscript(orgIdBranded, callId, {
        speaker,
        text: item.textContent,
        startMs: offsetMs,
        endMs: offsetMs,
        isFinal: true,
      }).catch((err: unknown) => console.warn("[agent] transcript persist failed", err));
    });

    // Per-leg latency from the framework's metrics events.
    session.on(AgentSessionEventTypes.MetricsCollected, (event) => {
      const m = (event.metrics ?? {}) as Record<string, unknown>;
      const ttft = typeof m.ttft === "number" ? m.ttft : null;
      const ttfb = typeof m.ttfb === "number" ? m.ttfb : null;
      const e2e = typeof m.e2eLatencyMs === "number" ? m.e2eLatencyMs : null;
      if (ttft != null) {
        void recordLatency(orgIdBranded, callIdBranded, {
          leg: "LLM_TTFT",
          valueMs: Math.round(ttft * 1000),
        });
      }
      if (ttfb != null) {
        void recordLatency(orgIdBranded, callIdBranded, {
          leg: "TTS_TTFA",
          valueMs: Math.round(ttfb * 1000),
        });
      }
      if (e2e != null) {
        void recordLatency(orgIdBranded, callIdBranded, {
          leg: "END_TO_END",
          valueMs: Math.round(e2e),
        });
      }
    });

    // Start
    await session.start({ agent, room: ctx.room });
    await session.say(buildGreeting(agentCtx));

    // Wait for hangup
    await new Promise<void>((resolve) => {
      const finish = () => resolve();
      ctx.room.once("disconnected", finish);
      ctx.room.on("participantDisconnected", (p: { identity?: string }) => {
        // The SIP participant disconnecting ends the call. The agent's own
        // participant identity won't trigger this since it's the local.
        if (p.identity?.startsWith("agent")) return;
        finish();
      });
    });

    const durationMs = Date.now() - callStartedAt;
    const costCents = estimateCallCostCents({
      durationMs,
      ttsProvider: agentCtx.ttsProvider,
      language: agentCtx.language,
    });
    await markCallEnded(callId, { status: "COMPLETED", durationMs, costCents });
    await recordCallEvent(orgIdBranded, callIdBranded, "HANGUP", { durationMs });
    await triggerPostCallAnalysis(callId);
  },
});

cli.runApp(new WorkerOptions({ agent: fileURLToPath(import.meta.url) }));
