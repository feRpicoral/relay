/**
 * Type definition for a voice option shown in the agent voice-picker UI. The
 * actual catalog is fetched live from each provider (see `cartesia-voices.ts`)
 * because hardcoding voice IDs causes "voice ID must be a valid UUID" failures
 * the moment the provider rotates them.
 */
export interface VoiceOption {
  provider: "cartesia" | "elevenlabs";
  voiceId: string;
  label: string;
  language: "pt-BR" | "en-US";
  gender: "female" | "male" | "neutral";
  description?: string;
}
