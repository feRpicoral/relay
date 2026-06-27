export type StatusTone = "primary" | "success" | "warning" | "destructive" | "muted";

export interface StatusVisual {
  tone: StatusTone;
  /** Render a pulsing dot for in-flight states (ringing, in progress, calling). */
  pulse?: boolean;
}

const MUTED: StatusVisual = { tone: "muted" };

const CALL_STATUS: Record<string, StatusVisual> = {
  RINGING: { tone: "warning", pulse: true },
  IN_PROGRESS: { tone: "primary", pulse: true },
  COMPLETED: { tone: "success" },
  FAILED: { tone: "destructive" },
  NO_ANSWER: MUTED,
  VOICEMAIL: MUTED,
};

const CALL_OUTCOME: Record<string, StatusVisual> = {
  SCHEDULED: { tone: "success" },
  QUALIFIED: { tone: "success" },
  TRANSFERRED: { tone: "warning" },
  NOT_QUALIFIED: { tone: "destructive" },
  NO_ANSWER: MUTED,
  OTHER: MUTED,
};

const SENTIMENT: Record<string, StatusVisual> = {
  POSITIVE: { tone: "success" },
  NEUTRAL: MUTED,
  NEGATIVE: { tone: "destructive" },
  MIXED: { tone: "warning" },
};

const CAMPAIGN_STATUS: Record<string, StatusVisual> = {
  DRAFT: MUTED,
  RUNNING: { tone: "primary", pulse: true },
  PAUSED: { tone: "warning" },
  COMPLETED: { tone: "success" },
  CANCELED: { tone: "destructive" },
};

const CAMPAIGN_LEAD_STATUS: Record<string, StatusVisual> = {
  PENDING: MUTED,
  CALLING: { tone: "primary", pulse: true },
  ATTEMPTED: MUTED,
  REACHED: { tone: "success" },
  NO_ANSWER: { tone: "warning" },
  VOICEMAIL: { tone: "warning" },
  FAILED: { tone: "destructive" },
  EXCLUDED: MUTED,
};

export const callStatusVisual = (status: string): StatusVisual => CALL_STATUS[status] ?? MUTED;
export const callOutcomeVisual = (outcome: string): StatusVisual => CALL_OUTCOME[outcome] ?? MUTED;
export const sentimentVisual = (sentiment: string): StatusVisual => SENTIMENT[sentiment] ?? MUTED;
export const campaignStatusVisual = (status: string): StatusVisual =>
  CAMPAIGN_STATUS[status] ?? MUTED;
export const campaignLeadStatusVisual = (status: string): StatusVisual =>
  CAMPAIGN_LEAD_STATUS[status] ?? MUTED;
