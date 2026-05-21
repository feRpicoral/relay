import "server-only";

import { optionalEnv } from "@/lib/env";

/**
 * Live voice catalog from Cartesia's API. We fetch this on every agent page
 * render so we never go stale — Cartesia rotates and adds voices, and the
 * IDs are UUIDs (not slugs), so caching them in source code is a recipe for
 * "voice ID must be a valid UUID" failures down the line.
 */
import { PROVIDER_VERSIONS } from "./provider-versions";

const CARTESIA_BASE = "https://api.cartesia.ai";

export interface CartesiaVoice {
  id: string;
  label: string;
  language: string;
  gender: string | null;
  description: string | null;
}

/**
 * Shape consumed by the agent voice-picker UI. The catalog lives in this
 * module (Cartesia-only today; ElevenLabs would be a sibling), so the UI type
 * lives here too — no separate `lib/voice/voices.ts` needed.
 */
export interface VoiceOption {
  provider: "cartesia" | "elevenlabs";
  voiceId: string;
  label: string;
  language: "pt-BR" | "en-US";
  gender: "female" | "male" | "neutral";
  description?: string;
}

interface CartesiaVoiceRaw {
  id: string;
  name?: string | null;
  language?: string | null;
  gender?: string | null;
  description?: string | null;
}

interface CartesiaListResponse {
  data?: CartesiaVoiceRaw[];
  has_more?: boolean;
}

/**
 * List voices available to the configured Cartesia API key. Optional language
 * filter is BCP-47 prefix (e.g. "pt", "en"), matched case-insensitively.
 * Returns [] if the API key is unset or the request fails — callers should
 * show a "no voices configured" empty state rather than crash.
 */
export async function listCartesiaVoices(opts?: { language?: string }): Promise<CartesiaVoice[]> {
  const apiKey = optionalEnv("CARTESIA_API_KEY");
  if (!apiKey) return [];

  try {
    const res = await fetch(`${CARTESIA_BASE}/voices?limit=100`, {
      headers: {
        "X-API-Key": apiKey,
        "Cartesia-Version": PROVIDER_VERSIONS.cartesiaApiVersion(),
      },
      // The page that calls this is server-rendered per request; opt out of
      // Next's data cache so users see the latest catalog when Cartesia adds
      // a voice without us redeploying.
      cache: "no-store",
    });
    if (!res.ok) {
      console.warn("[cartesia-voices] list returned", res.status);
      return [];
    }
    const json = (await res.json()) as CartesiaListResponse;
    const raw = json.data ?? [];
    const langPrefix = opts?.language?.toLowerCase();
    return raw
      .filter((v) => {
        if (!langPrefix) return true;
        return (v.language ?? "").toLowerCase().startsWith(langPrefix);
      })
      .map((v) => ({
        id: v.id,
        label: v.name ?? v.id.slice(0, 8),
        language: v.language ?? "unknown",
        gender: v.gender ?? null,
        description: v.description ?? null,
      }));
  } catch (err) {
    console.warn("[cartesia-voices] list failed:", err);
    return [];
  }
}
