/**
 * Deepgram Flux STT adapter.
 *
 * The LiveKit Agents Deepgram plugin reads `DEEPGRAM_API_KEY` directly, but
 * we keep this thin adapter so the worker can: (a) fail fast at startup with a
 * clear error if the key is missing, (b) expose the configured model in one
 * place, and (c) provide a uniform interface alongside the TTS adapters.
 */
import { envOr } from "@/lib/env";

interface DeepgramConfig {
  apiKey: string;
  model: string;
}

let cached: DeepgramConfig | null = null;

export function getDeepgramConfig(): DeepgramConfig {
  if (cached) return cached;
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    throw new Error("DEEPGRAM_API_KEY not set — STT is required for the agent worker.");
  }
  cached = { apiKey, model: envOr("DEEPGRAM_MODEL", "flux-general") };
  return cached;
}

export function isDeepgramConfigured(): boolean {
  return Boolean(process.env.DEEPGRAM_API_KEY);
}
