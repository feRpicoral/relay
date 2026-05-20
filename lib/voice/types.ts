import { z } from "zod";

/**
 * Agent context resolved at call start. The worker uses this to load the right
 * persona, language, voice, and KB before the conversation begins.
 */
export interface AgentContext {
  callId: string;
  orgId: string;
  agentId: string;
  language: "pt-BR" | "en-US" | "auto";
  ttsProvider: "cartesia" | "elevenlabs";
  voiceId: string;
  personaPrompt: string;
  greeting: string;
  knowledgeChunks: string[];
  businessHours: BusinessHours;
  fallbackTransferE164: string | null;
  // Domain of the org's Twilio Elastic SIP Trunk (e.g. `relay-abc.pstn.twilio.com`).
  // The worker uses this as the host for `sip:<e164>@<domain>` when REFERring
  // the call during transfer_to_human. Null if the org hasn't connected Twilio.
  transferSipDomain: string | null;
  callerE164: string;
  calleeE164: string;
}

export interface BusinessHoursDay {
  open: string;
  close: string;
}

export interface BusinessHours {
  timezone: string;
  monday?: BusinessHoursDay | null;
  tuesday?: BusinessHoursDay | null;
  wednesday?: BusinessHoursDay | null;
  thursday?: BusinessHoursDay | null;
  friday?: BusinessHoursDay | null;
  saturday?: BusinessHoursDay | null;
  sunday?: BusinessHoursDay | null;
}

export const BusinessHoursSchema = z.object({
  timezone: z.string().default("America/Sao_Paulo"),
  monday: z.object({ open: z.string(), close: z.string() }).nullable().optional(),
  tuesday: z.object({ open: z.string(), close: z.string() }).nullable().optional(),
  wednesday: z.object({ open: z.string(), close: z.string() }).nullable().optional(),
  thursday: z.object({ open: z.string(), close: z.string() }).nullable().optional(),
  friday: z.object({ open: z.string(), close: z.string() }).nullable().optional(),
  saturday: z.object({ open: z.string(), close: z.string() }).nullable().optional(),
  sunday: z.object({ open: z.string(), close: z.string() }).nullable().optional(),
});

export type TranscriptDelta = {
  speaker: "USER" | "AGENT";
  text: string;
  isFinal: boolean;
  startMs: number;
  endMs: number;
  confidence?: number;
};

export type ToolCallRecord = {
  name: string;
  inputJson: Record<string, unknown>;
  outputJson?: Record<string, unknown>;
  errorMessage?: string;
  startedAt: Date;
  endedAt?: Date;
  durationMs?: number;
};

export type LatencyMetric = {
  leg: "STT_FINALIZE" | "LLM_TTFT" | "LLM_TOTAL" | "TTS_TTFA" | "TOOL_TOTAL" | "END_TO_END";
  valueMs: number;
  metadata?: Record<string, unknown>;
};
