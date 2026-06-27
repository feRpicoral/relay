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
// Load .env.local before anything reads process.env (worker:dev only; prod env
// comes from the host). Keep this first.
import "./load-env";

import { installAnthropicToolIdShim } from "@/lib/voice/anthropic-tool-id-shim";

// Install the shim BEFORE the LLM plugin module is loaded so the patched
// fetch is in place by the time the first request goes out. See the module
// for context on what this works around.
installAnthropicToolIdShim();

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
import { asAgentId, asCallId, asOrgId, asPhoneNumberId } from "@/lib/db/types";
import { requireEnv } from "@/lib/env";
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
import {
  AGENT_PARTICIPANT_IDENTITY_PREFIX,
  MAX_AVAILABILITY_CANDIDATES,
  MAX_FREEFORM_REASON_LEN,
  PROVIDER_VERSIONS,
} from "@/lib/voice/provider-versions";
import { runInstrumentedTool } from "@/lib/voice/tool-instrumentation";
import { lookupKb } from "@/lib/voice/tools/lookup-kb";

const { AgentSessionEventTypes } = voice;

export default defineAgent({
  entry: async (ctx: JobContext) => {
    await ctx.connect();

    // For an inbound SIP call, LiveKit attaches SIP attributes to the
    // participant. For the test-call feature, the room metadata carries the
    // pre-created callId. We support both paths.
    const participant = await ctx.waitForParticipant();

    const attrs = participant.attributes ?? {};
    const sipFrom = attrs["sip.phoneNumber"] ?? attrs["sip.from"] ?? "";
    const sipTo = attrs["sip.trunkPhoneNumber"] ?? attrs["sip.to"] ?? "";
    const hasSipAttrs = Boolean(sipFrom || sipTo);
    // No SIP attrs means the participant joined via WebRTC (test page), not a
    // real PSTN call. transfer_to_human and anything else that touches
    // LiveKit's SIP plane has to be a no-op since there's no SIP session.
    const isTestCall = !hasSipAttrs;

    let callId: string | null = null;
    let orgId: string | null = null;

    // Precreated rooms (test-call, outbound campaign dispatch) carry the
    // callId/orgId in room.metadata. Read that first — for outbound calls the
    // SIP `sip.to` is the callee's number (not one of our owned numbers), so
    // falling into the inbound branch would 404 the lookup and disconnect.
    let meta: { callId?: string; orgId?: string } = {};
    try {
      meta = JSON.parse(ctx.room.metadata ?? "{}");
    } catch {
      // Not JSON; treat as no metadata.
    }

    if (meta.callId && meta.orgId) {
      callId = meta.callId;
      orgId = meta.orgId;
    } else if (sipTo) {
      const phone = await resolvePhoneNumber(sipTo);
      if (!phone?.agentId) {
        console.warn(`[agent] unknown inbound number ${sipTo}`);
        await ctx.room.disconnect();
        return;
      }
      const created = await createInboundCall({
        orgId: asOrgId(phone.orgId),
        agentId: asAgentId(phone.agentId),
        phoneNumberId: asPhoneNumberId(phone.id),
        callerE164: sipFrom,
        calleeE164: sipTo,
        livekitRoomName: ctx.room.name,
      });
      callId = created.callId;
      orgId = created.orgId;
    } else {
      console.warn(`[agent] no SIP attrs and no room metadata; disconnecting`);
      await ctx.room.disconnect();
      return;
    }

    const agentCtx = await loadAgentContext(callId);
    if (!agentCtx) {
      console.warn(`[agent] missing context for call ${callId}`);
      await ctx.room.disconnect();
      return;
    }

    const callIdBranded = asCallId(callId);
    const orgIdBranded = asOrgId(orgId);

    await markCallAnswered(orgIdBranded, callIdBranded);
    await recordCallEvent(orgIdBranded, callIdBranded, "ROOM_CREATED", {
      roomName: ctx.room.name,
    });

    const language = agentCtx.language === "auto" ? "pt-BR" : agentCtx.language;
    const systemPrompt = buildSystemPrompt({ ...agentCtx, language });
    const callStartedAt = Date.now();

    // Tools. The three observability-only tools share the same instrumentation
    // wrapper; transfer_to_human stays inline because it has bespoke
    // "fallback not configured" branches that return a result object instead
    // of throwing.
    const tools = {
      check_availability: llmModule.tool({
        description:
          "Check available appointment slots within a date range. Returns up to 5 candidate slots.",
        parameters: z.object({
          from: z.string().describe("ISO 8601 datetime of the earliest acceptable slot"),
          to: z.string().describe("ISO 8601 datetime of the latest acceptable slot"),
          durationMin: z.number().int().positive().describe("Appointment length in minutes"),
        }),
        async execute(input) {
          return runInstrumentedTool({
            orgId: orgIdBranded,
            callId: callIdBranded,
            name: "check_availability",
            input,
            execute: async () => {
              const slots = await calcom.getAvailableSlots({
                orgId: orgIdBranded,
                fromIso: input.from,
                toIso: input.to,
                durationMin: input.durationMin,
              });
              return { slots: slots.slice(0, MAX_AVAILABILITY_CANDIDATES) };
            },
          });
        },
      }),

      book_appointment: llmModule.tool({
        description: "Book an appointment at the given slot. Returns a confirmation id.",
        parameters: z.object({
          slotIso: z.string(),
          durationMin: z.number().int().positive(),
          patientName: z.string().min(2).max(120),
          patientPhone: z.string().min(8).max(20),
          reason: z.string().max(MAX_FREEFORM_REASON_LEN).optional(),
          eventTypeName: z
            .string()
            .max(120)
            .optional()
            .describe("Title of the chosen appointment type, for display in the calendar."),
        }),
        async execute(input) {
          return runInstrumentedTool({
            orgId: orgIdBranded,
            callId: callIdBranded,
            name: "book_appointment",
            input,
            execute: async () => {
              const booking = await calcom.bookAppointment({
                orgId: orgIdBranded,
                slotIso: input.slotIso,
                durationMin: input.durationMin,
                patientName: input.patientName,
                patientPhone: input.patientPhone,
                reason: input.reason,
              });
              return { confirmationId: booking.id, status: booking.status };
            },
          });
        },
      }),

      lookup_kb: llmModule.tool({
        description:
          "Search the business knowledge base (FAQ, hours, policies). Use BEFORE answering any question not in your context.",
        parameters: z.object({ query: z.string().min(2).max(500) }),
        async execute(input) {
          return runInstrumentedTool({
            orgId: orgIdBranded,
            callId: callIdBranded,
            name: "lookup_kb",
            input,
            execute: async () => {
              const chunks = await lookupKb(orgIdBranded, input.query);
              return { chunks };
            },
          });
        },
      }),

      transfer_to_human: llmModule.tool({
        description:
          "Transfer the call to the human fallback number. Use only when you cannot help or the caller explicitly asks for a person.",
        parameters: z.object({ reason: z.string().min(2).max(MAX_FREEFORM_REASON_LEN) }),
        async execute({ reason }) {
          const startedAt = new Date();
          await recordCallEvent(orgIdBranded, callIdBranded, "TRANSFER_REQUESTED", { reason });
          if (isTestCall) {
            // No SIP session to transfer in a browser-WebRTC test call.
            // Return a graceful error so Claude tells the caller verbally
            // instead of looping on the same failure.
            const endedAt = new Date();
            await recordToolCall(orgIdBranded, callIdBranded, {
              name: "transfer_to_human",
              inputJson: { reason },
              errorMessage: "Transfer not available in browser test call (no SIP session).",
              startedAt,
              endedAt,
              durationMs: endedAt.getTime() - startedAt.getTime(),
            });
            return {
              ok: false,
              error: "transfer_unavailable_in_test_call",
              message:
                "Transfers don't work in the browser test mode. In a real phone call this would forward to the fallback number.",
            };
          }
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

      end_call: llmModule.tool({
        description:
          "End the call after you've fully helped the caller and there's nothing left to do. Pass the farewell sentence you want spoken in the caller's language (e.g. 'Obrigada pela ligação, tenha um ótimo dia!'). The system will speak it cleanly and then disconnect — do NOT also say goodbye in your text response, that would say it twice. Do NOT use this as a way to escape difficult conversations — for those, use `transfer_to_human` instead.",
        parameters: z.object({
          farewell: z
            .string()
            .min(2)
            .max(200)
            .describe(
              "The brief farewell sentence to speak before hanging up, in the caller's language. Keep it natural and short — one sentence.",
            ),
          summary: z
            .string()
            .min(2)
            .max(MAX_FREEFORM_REASON_LEN)
            .describe(
              "Internal one-sentence summary of why the call is ending (e.g. 'appointment booked'). Not spoken aloud — used for post-call analytics only.",
            ),
        }),
        async execute({ farewell, summary }, opts) {
          const startedAt = new Date();
          // No dedicated AGENT_HANGUP event type in the CallEventType enum.
          // Use HANGUP with `initiator: "agent"` metadata so post-call analysis
          // can distinguish "agent ended cleanly" from "caller dropped".
          await recordCallEvent(orgIdBranded, callIdBranded, "HANGUP", {
            initiator: "agent",
            summary,
            farewell,
          });
          await recordToolCall(orgIdBranded, callIdBranded, {
            name: "end_call",
            inputJson: { farewell, summary },
            startedAt,
            endedAt: new Date(),
            durationMs: 0,
          });
          // Fire-and-forget: speak the farewell ourselves with interruptions
          // disabled, await the *actual* playout (not the RunContext's, which
          // resolves the instant the framework marks the generation done and
          // happily returns mid-syllable if any interrupt fires), then drop
          // the room. Using `allowInterruptions: false` is the only way to
          // guarantee user noise or backchannels can't cut the goodbye off.
          // The 500ms grace covers the codec/network tail after the last
          // frame is "played".
          void (async () => {
            try {
              const handle = opts.ctx.session.say(farewell, {
                allowInterruptions: false,
              });
              await handle.waitForPlayout();
            } catch (err) {
              console.warn("[agent] end_call farewell failed", err);
            }
            await new Promise((r) => setTimeout(r, 500));
            void ctx.room.disconnect().catch(() => undefined);
          })();
          // Return undefined (not { ok: true }) so the framework sets
          // replyRequired=false and skips the follow-up LLM turn. We don't
          // want a "..., did you have anything else?" message queued behind
          // our uninterruptible farewell — that would either play after the
          // farewell (annoying) or race the room.disconnect() (audible
          // garble). The tool call still gets recorded in chat ctx.
          return undefined;
        },
      }),
    };

    // We deliberately use deepgram.STT (V1, /v1/listen) rather than STTv2
    // (Flux). STTv2 only accepts flux-general-en or flux-general-multi —
    // passing nova-3 fails the WebSocket handshake with a generic 400. Nova-3
    // is the current Deepgram flagship for low-latency streaming and supports
    // pt-BR natively. The V1 class also exposes interimResults/endpointing
    // params that AgentSession's VAD-driven turn loop expects.
    const stt = new deepgram.STT({
      apiKey: requireEnv("DEEPGRAM_API_KEY"),
      model: PROVIDER_VERSIONS.deepgram() as deepgram.STTOptions["model"],
      language: language === "pt-BR" ? "pt-BR" : "en-US",
    });

    const llm = new openai.LLM({
      apiKey: requireEnv("ANTHROPIC_API_KEY"),
      baseURL: "https://api.anthropic.com/v1/",
      model: PROVIDER_VERSIONS.anthropicFast(),
    });

    const tts =
      agentCtx.ttsProvider === "elevenlabs"
        ? new elevenlabs.TTS({
            apiKey: requireEnv("ELEVENLABS_API_KEY"),
            voiceId: agentCtx.voiceId,
            model: PROVIDER_VERSIONS.elevenlabs(),
            languageCode: language === "pt-BR" ? "pt" : "en",
          })
        : new cartesia.TTS({
            apiKey: requireEnv("CARTESIA_API_KEY"),
            model: PROVIDER_VERSIONS.cartesia(),
            voice: agentCtx.voiceId,
            language: language === "pt-BR" ? "pt" : "en",
          });

    // Silero's default `minSilenceDuration: 550ms` declares end-of-speech the
    // moment a caller takes a normal breath, which is what feeds the agent's
    // "turn ended, time to respond" trigger. Bump to 800ms so the VAD itself
    // is more tolerant of natural pauses before the endpointing delay even
    // starts counting.
    const vad = await silero.VAD.load({ minSilenceDuration: 800 });

    const session = new voice.AgentSession({
      stt,
      llm,
      tts,
      vad,
      // Framework defaults (minDelay 500ms, minDuration 500ms, minWords 0) are
      // tuned for fluent English speakers on a quiet line and are far too
      // aggressive for pt-BR phone conversations. Callers routinely pause
      // 1+ second mid-thought, and short backchannels ("sim", "uh-huh", "ok")
      // were tripping the interruption detector before they'd finished a
      // word. Wait 1500ms of silence before declaring the user's turn over,
      // and require 1200ms+ of overlapping speech containing 4+ words before
      // treating it as a real interruption.
      turnHandling: {
        endpointing: { minDelay: 1500, maxDelay: 8000 },
        interruption: { minDuration: 1200, minWords: 4 },
      },
    });

    const agent = new voice.Agent({
      instructions: systemPrompt,
      tools,
    });

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
      }).catch((err: unknown) => {
        console.warn("[agent] transcript persist failed", err);
        // Surface the failure to the call-detail page via CallEvent.ERROR so
        // ops can see DB blips correlated with calls.
        void recordCallEvent(orgIdBranded, callIdBranded, "ERROR", {
          where: "appendTranscript",
          message: err instanceof Error ? err.message : String(err),
        }).catch(() => undefined);
      });
    });

    // Per-leg latency from the framework's metrics events.
    //
    // The framework emits a discriminated union: STTMetrics, LLMMetrics,
    // TTSMetrics, VADMetrics, EOUMetrics, etc. — keyed on `metrics.type`.
    // All timing fields are already milliseconds (`ttftMs`, `ttfbMs`,
    // `durationMs`, `endOfUtteranceDelayMs`). The previous implementation
    // looked for `ttft`/`ttfb`/`e2eLatencyMs` and never matched, which is
    // why call_metrics had zero rows.
    session.on(AgentSessionEventTypes.MetricsCollected, (event) => {
      const m = event.metrics as
        | {
            type: string;
            ttftMs?: number;
            ttfbMs?: number;
            durationMs?: number;
            endOfUtteranceDelayMs?: number;
          }
        | undefined;
      if (!m || typeof m !== "object") return;

      const onLatencyErr = (where: string) => (err: unknown) => {
        console.warn(`[agent] recordLatency ${where} failed`, err);
        void recordCallEvent(orgIdBranded, callIdBranded, "ERROR", {
          where: `recordLatency.${where}`,
          message: err instanceof Error ? err.message : String(err),
        }).catch(() => undefined);
      };
      const write = (
        leg: "STT_FINALIZE" | "LLM_TTFT" | "LLM_TOTAL" | "TTS_TTFA" | "END_TO_END",
        ms: number,
      ) => {
        void recordLatency(orgIdBranded, callIdBranded, {
          leg,
          valueMs: Math.round(ms),
        }).catch(onLatencyErr(leg));
      };

      switch (m.type) {
        case "llm_metrics":
          if (typeof m.ttftMs === "number") write("LLM_TTFT", m.ttftMs);
          if (typeof m.durationMs === "number") write("LLM_TOTAL", m.durationMs);
          break;
        case "tts_metrics":
          if (typeof m.ttfbMs === "number") write("TTS_TTFA", m.ttfbMs);
          break;
        case "stt_metrics":
          // STT streaming reports duration=0; skip those, only record final
          // finalization batches if they ever come through.
          if (typeof m.durationMs === "number" && m.durationMs > 0) {
            write("STT_FINALIZE", m.durationMs);
          }
          break;
        case "eou_metrics":
          // EOU delay is the closest proxy to "user-finished-talking → agent-
          // turn-decided"; we treat it as END_TO_END for the latency meter.
          if (typeof m.endOfUtteranceDelayMs === "number") {
            write("END_TO_END", m.endOfUtteranceDelayMs);
          }
          break;
      }
    });

    await session.start({ agent, room: ctx.room });
    await session.say(buildGreeting(agentCtx));

    // Wait for hangup. Both events can fire (e.g. SIP participant leaves, then
    // room finishes), so we guard against double-resolve and remove the
    // listener once one wins. Without `off()` the participantDisconnected
    // handler would linger in the worker process and double-handle on any
    // late-arriving event.
    await new Promise<void>((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        ctx.room.off("participantDisconnected", onParticipantLeft);
        resolve();
      };
      const onParticipantLeft = (p: { identity?: string }) => {
        // The SIP participant disconnecting ends the call. The agent's own
        // participant identity won't trigger this since it's the local.
        if (p.identity?.startsWith(AGENT_PARTICIPANT_IDENTITY_PREFIX)) return;
        finish();
      };
      ctx.room.once("disconnected", finish);
      ctx.room.on("participantDisconnected", onParticipantLeft);
    });

    // Post-hangup finalization MUST not throw unhandled: this worker process
    // serves multiple calls in sequence and an unhandled rejection here
    // crashes the entire worker. We wrap each side-effect individually so a
    // single failure doesn't skip the others.
    const durationMs = Date.now() - callStartedAt;
    const costCents = estimateCallCostCents({
      durationMs,
      ttsProvider: agentCtx.ttsProvider,
      language: agentCtx.language,
    });
    try {
      await markCallEnded(orgIdBranded, callIdBranded, {
        status: "COMPLETED",
        durationMs,
        costCents,
      });
    } catch (err) {
      console.warn("[agent] markCallEnded failed", err);
    }
    try {
      await recordCallEvent(orgIdBranded, callIdBranded, "HANGUP", { durationMs });
    } catch (err) {
      console.warn("[agent] recordCallEvent HANGUP failed", err);
    }
    // Fire-and-forget the post-call analysis: it has its own Inngest retries
    // and we don't want to block worker teardown on it.
    void triggerPostCallAnalysis(callId).catch((err: unknown) =>
      console.warn("[agent] triggerPostCallAnalysis failed", err),
    );
  },
});

cli.runApp(new WorkerOptions({ agent: fileURLToPath(import.meta.url) }));
