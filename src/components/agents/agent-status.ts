import type { StatusTone } from "@/lib/status-tone";

export type AgentSetupState = "active" | "paused" | "setup";

export interface AgentSetupInput {
  voiceId: string;
  enabled: boolean;
  phoneNumberCount: number;
}

export function agentSetupState({
  voiceId,
  enabled,
  phoneNumberCount,
}: AgentSetupInput): AgentSetupState {
  if (voiceId === "" || phoneNumberCount === 0) return "setup";
  return enabled ? "active" : "paused";
}

export const agentSetupTone: Record<AgentSetupState, StatusTone> = {
  active: "success",
  paused: "muted",
  setup: "warning",
};
