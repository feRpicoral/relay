export interface UserTurn {
  text: string;
  startMs: number;
  endMs: number;
  confidence?: number;
}

export interface SynthesizeInput {
  text: string;
  voiceId: string;
  language: "pt-BR" | "en-US";
}

export interface TtsEndpoint {
  synthesize(input: SynthesizeInput): Promise<{ audio: Buffer; sampleRate: number }>;
}
