import { envOr } from "@/lib/env";

import type { SynthesizeInput, TtsEndpoint } from "../types";

const CARTESIA_URL = "https://api.cartesia.ai/tts/bytes";
const CARTESIA_VERSION = envOr("CARTESIA_VERSION", "2025-04-16");
const CARTESIA_MODEL = envOr("CARTESIA_MODEL", "sonic-3");

export const cartesiaTts: TtsEndpoint = {
  async synthesize({ text, voiceId, language }: SynthesizeInput) {
    const apiKey = process.env.CARTESIA_API_KEY;
    if (!apiKey) throw new Error("CARTESIA_API_KEY not set");

    const res = await fetch(CARTESIA_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cartesia-Version": CARTESIA_VERSION,
        "X-API-Key": apiKey,
      },
      body: JSON.stringify({
        model_id: CARTESIA_MODEL,
        transcript: text,
        voice: { mode: "id", id: voiceId },
        output_format: {
          container: "raw",
          encoding: "pcm_s16le",
          sample_rate: 16000,
        },
        language: language === "pt-BR" ? "pt" : "en",
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Cartesia TTS failed: ${res.status} ${errText}`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    return { audio: buf, sampleRate: 16000 };
  },
};
