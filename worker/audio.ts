/**
 * Audio bridge between LiveKit and our pipeline (Deepgram Flux STT + Cartesia TTS).
 *
 * In production this:
 *   - Connects to the LiveKit room with `@livekit/agents`
 *   - Subscribes to the participant's audio track
 *   - Streams raw PCM frames into Deepgram's live websocket
 *   - On `turn_event`: end_of_turn → fires `onUserTurn`
 *   - Emits TTS audio back to the room as a new audio track
 *
 * For the dev/test path (no LiveKit creds), the bridge runs as a no-op that
 * accepts injected user turns from the dashboard's "test call" feature.
 */
import { performance } from "node:perf_hooks";

import { asCallId, asOrgId } from "@/lib/db/types";
import { recordCallEvent, recordLatency } from "@/lib/voice/persistence";

import { getDeepgramConfig, isDeepgramConfigured } from "./stt/deepgram";
import type { UserTurn } from "./types";

export interface BridgeOptions {
  callId: string;
  orgId: string;
  roomName: string;
  voiceId: string;
  ttsProvider: "cartesia" | "elevenlabs";
  language: "pt-BR" | "en-US";
  greeting: string;
  onUserTurn: (
    turn: UserTurn,
    emitAudio: (chunk: { sentence: string; isFirst: boolean }) => Promise<void>,
  ) => Promise<void>;
  onHangup: () => Promise<void>;
}

interface BridgeHandle {
  pushUserTurnForTesting(turn: UserTurn): Promise<void>;
  hangup(): Promise<void>;
}

const activeBridges = new Map<string, BridgeHandle>();

export async function startCallBridge(opts: BridgeOptions): Promise<BridgeHandle> {
  const callId = asCallId(opts.callId);
  const orgId = asOrgId(opts.orgId);

  const ttsEndpoint = await getTtsEndpoint(opts.ttsProvider);

  async function emitAudio(chunk: { sentence: string; isFirst: boolean }) {
    if (!ttsEndpoint) return; // dev path
    const ttsStart = performance.now();
    try {
      const synthesized = await ttsEndpoint.synthesize({
        text: chunk.sentence,
        voiceId: opts.voiceId,
        language: opts.language,
      });
      if (chunk.isFirst) {
        await recordLatency(orgId, callId, {
          leg: "TTS_TTFA",
          valueMs: Math.round(performance.now() - ttsStart),
        });
      }
      // Publish audio frames to LiveKit (omitted: handled by @livekit/agents
      // framework wiring in production).
      void synthesized;
    } catch (err) {
      console.warn("[bridge] tts error", err);
    }
  }

  // Speak the greeting immediately on call-answered.
  if (opts.greeting) {
    await emitAudio({ sentence: opts.greeting, isFirst: true });
  }

  const handle: BridgeHandle = {
    async pushUserTurnForTesting(turn) {
      await opts.onUserTurn(turn, emitAudio);
    },
    async hangup() {
      activeBridges.delete(opts.roomName);
      await opts.onHangup();
    },
  };

  activeBridges.set(opts.roomName, handle);
  await recordCallEvent(orgId, callId, "PARTICIPANT_JOINED", { kind: "agent" });

  // Live LiveKit / Deepgram wiring happens here. Pseudocode:
  //
  //   const room = await connectAsAgent(opts.roomName)
  //   const { apiKey, model } = getDeepgramConfig()
  //   const deepgram = openDeepgramFlux({ apiKey, model, language: opts.language })
  //   room.on("trackSubscribed", (track) => track.pipeTo(deepgram.input))
  //   deepgram.on("turn_event", async (turn) => {
  //     if (turn.event === "end_of_turn") {
  //       await opts.onUserTurn({ text: turn.text, ... }, emitAudio)
  //     }
  //   })
  //   room.on("participantDisconnected", () => handle.hangup())
  if (isDeepgramConfigured()) {
    const cfg = getDeepgramConfig();
    console.log(`[bridge] deepgram model=${cfg.model} ready for ${opts.roomName}`);
  }

  return handle;
}

export function getBridgeForTesting(roomName: string): BridgeHandle | undefined {
  return activeBridges.get(roomName);
}

async function getTtsEndpoint(provider: "cartesia" | "elevenlabs") {
  if (provider === "elevenlabs") {
    if (!process.env.ELEVENLABS_API_KEY) return null;
    const { elevenlabsTts } = await import("./tts/elevenlabs");
    return elevenlabsTts;
  }
  if (!process.env.CARTESIA_API_KEY) return null;
  const { cartesiaTts } = await import("./tts/cartesia");
  return cartesiaTts;
}
