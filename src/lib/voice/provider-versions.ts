import { envOr } from "@/lib/env";

/**
 * Single source of truth for provider model identifiers. Each one can be
 * overridden via env to bump without a code change. Centralized here so a
 * model rotation is one PR instead of touching the worker, post-call Inngest,
 * `.env.example`, and the README.
 */
export const PROVIDER_VERSIONS = {
  anthropicFast: () => envOr("ANTHROPIC_MODEL_FAST", "claude-haiku-4-5-20251001"),
  anthropicSummary: () => envOr("ANTHROPIC_MODEL_SUMMARY", "claude-sonnet-4-6"),
  /** Deepgram STT model. v1 endpoint, supports nova-3 + pt-BR. */
  deepgram: () => envOr("DEEPGRAM_MODEL", "nova-3"),
  elevenlabs: () => envOr("ELEVENLABS_MODEL", "eleven_flash_v2_5"),
  cartesia: () => envOr("CARTESIA_MODEL", "sonic-3"),
  cartesiaApiVersion: () => "2024-11-13",
} as const;

/** LiveKit Agents framework prefixes the worker's local participant identity
 * with "agent". Used to distinguish the worker's own participant from SIP
 * legs during disconnect handling. */
export const AGENT_PARTICIPANT_IDENTITY_PREFIX = "agent";

/** Cap on slot candidates returned to the LLM. Keeps tool output compact. */
export const MAX_AVAILABILITY_CANDIDATES = 5;

export const MAX_KB_CHUNKS_PER_AGENT = 20;

/** Free-form description / reason length cap shared by several tool inputs. */
export const MAX_FREEFORM_REASON_LEN = 280;
