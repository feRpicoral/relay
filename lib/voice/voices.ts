/**
 * Pre-vetted voice catalog. We expose a curated subset of each provider's voices
 * because exposing every voice with no preview is overwhelming. These IDs are the
 * Cartesia / ElevenLabs voice IDs.
 */

export interface VoiceOption {
  provider: "cartesia" | "elevenlabs";
  voiceId: string;
  label: string;
  language: "pt-BR" | "en-US";
  gender: "female" | "male" | "neutral";
  description?: string;
}

export const VOICES: readonly VoiceOption[] = [
  // Cartesia — pt-BR
  {
    provider: "cartesia",
    voiceId: "pt-br-mariana",
    label: "Mariana",
    language: "pt-BR",
    gender: "female",
    description: "Voz feminina calorosa, ideal pra clínicas.",
  },
  {
    provider: "cartesia",
    voiceId: "pt-br-rafael",
    label: "Rafael",
    language: "pt-BR",
    gender: "male",
    description: "Voz masculina profissional.",
  },
  {
    provider: "cartesia",
    voiceId: "pt-br-juliana",
    label: "Juliana",
    language: "pt-BR",
    gender: "female",
    description: "Voz feminina jovem e descontraída.",
  },

  // Cartesia — en-US
  {
    provider: "cartesia",
    voiceId: "en-us-emma",
    label: "Emma",
    language: "en-US",
    gender: "female",
    description: "Warm, neutral US accent.",
  },
  {
    provider: "cartesia",
    voiceId: "en-us-noah",
    label: "Noah",
    language: "en-US",
    gender: "male",
    description: "Professional, clear US accent.",
  },

  // ElevenLabs — premium SKU
  {
    provider: "elevenlabs",
    voiceId: "21m00Tcm4TlvDq8ikWAM",
    label: "Rachel (premium)",
    language: "en-US",
    gender: "female",
    description: "ElevenLabs Flash v2.5 — highest quality.",
  },
];

export const DEFAULT_VOICE_PT_BR = "pt-br-mariana";
export const DEFAULT_VOICE_EN_US = "en-us-emma";

export function getVoice(voiceId: string): VoiceOption | undefined {
  return VOICES.find((v) => v.voiceId === voiceId);
}

export function getVoicesByLanguage(language: "pt-BR" | "en-US"): readonly VoiceOption[] {
  return VOICES.filter((v) => v.language === language);
}
