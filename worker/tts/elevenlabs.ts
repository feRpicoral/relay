import type { SynthesizeInput, TtsEndpoint } from "../types";

const ELEVEN_URL = "https://api.elevenlabs.io/v1/text-to-speech";

export const elevenlabsTts: TtsEndpoint = {
  async synthesize({ text, voiceId }: SynthesizeInput) {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) throw new Error("ELEVENLABS_API_KEY not set");

    const res = await fetch(`${ELEVEN_URL}/${voiceId}/stream?output_format=pcm_16000`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_flash_v2_5",
        voice_settings: { stability: 0.4, similarity_boost: 0.75 },
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`ElevenLabs TTS failed: ${res.status} ${errText}`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    return { audio: buf, sampleRate: 16000 };
  },
};
