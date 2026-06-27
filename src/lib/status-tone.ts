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

/**
 * Cal.com booking statuses are lowercase strings on the v2 API. We normalize
 * to lowercase before lookup so casing drift doesn't fall through to muted.
 */
const BOOKING_STATUS: Record<string, StatusVisual> = {
  accepted: { tone: "success" },
  confirmed: { tone: "success" },
  pending: { tone: "warning" },
  cancelled: { tone: "destructive" },
  rejected: { tone: "destructive" },
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

export type BookingStatusKey = "confirmed" | "pending" | "cancelled" | "unknown";

const BOOKING_STATUS_KEY: Record<string, BookingStatusKey> = {
  accepted: "confirmed",
  confirmed: "confirmed",
  pending: "pending",
  cancelled: "cancelled",
  rejected: "cancelled",
};

/** Collapses Cal.com's status vocabulary to the three labels the UI shows. */
export const bookingStatusKey = (status: string): BookingStatusKey =>
  BOOKING_STATUS_KEY[status.toLowerCase()] ?? "unknown";

/** Maps a Cal.com booking status (any casing) to its badge tone. */
export const bookingStatusVisual = (status: string): StatusVisual =>
  BOOKING_STATUS[status.toLowerCase()] ?? MUTED;
export const callStatusVisual = (status: string): StatusVisual => CALL_STATUS[status] ?? MUTED;
export const callOutcomeVisual = (outcome: string): StatusVisual => CALL_OUTCOME[outcome] ?? MUTED;
export const sentimentVisual = (sentiment: string): StatusVisual => SENTIMENT[sentiment] ?? MUTED;
export const campaignStatusVisual = (status: string): StatusVisual =>
  CAMPAIGN_STATUS[status] ?? MUTED;
export const campaignLeadStatusVisual = (status: string): StatusVisual =>
  CAMPAIGN_LEAD_STATUS[status] ?? MUTED;
