/** Default timezone for orgs that haven't picked one yet (Brazilian portfolio bias). */
export const DEFAULT_TIMEZONE = "America/Sao_Paulo";

/** Default working hours when a user creates an agent or campaign. */
export const DEFAULT_OPEN_HOURS = { open: "08:00", close: "18:00" } as const;
export const DEFAULT_CAMPAIGN_HOURS = { open: "09:00", close: "18:00" } as const;

/** Length used when prefixing org-scoped resource names with a short id slice. */
export const ORG_NAME_PREFIX_LEN = 8;

/** LiveKit room name convention: `<ROOM_PREFIX><callId>`. */
export const ROOM_PREFIX = "call-";

/** SIP transport id corresponding to UDP in the LiveKit SDK enum. */
export const SIP_TRANSPORT_UDP = 1;

/** How long an invite link stays valid before requiring a re-send. */
export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Latency budgets per pipeline leg (ms). Surfaced in the UI as alerting thresholds. */
export const LEG_BUDGET_MS = {
  STT_FINALIZE: 300,
  LLM_TTFT: 400,
  LLM_TOTAL: 800,
  TTS_TTFA: 150,
  TOOL_TOTAL: 600,
  END_TO_END: 900,
} as const;
