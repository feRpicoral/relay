import type { CallOutcome, CampaignLeadStatus } from "@prisma/client";

export interface LeadTransitionInput {
  /** Outcome assigned to the call by post-call analysis. */
  outcome: CallOutcome | null;
  /** Attempts count on the lead row *before* this attempt was made. */
  priorAttempts: number;
  /** Campaign-level retry budget. */
  maxAttempts: number;
  /** Backoff between retries, in minutes. */
  cooldownMinutes: number;
  /** Current wall clock; injectable for tests. */
  now?: Date;
}

export interface LeadTransition {
  status: CampaignLeadStatus;
  outcome: CallOutcome | null;
  nextEligibleAt: Date | null;
  reachedAt: Date | null;
}

/**
 * Map a call outcome onto the next CampaignLead state. Pure so it's covered by
 * unit tests without standing up a DB; the caller commits the result inside an
 * Inngest step.
 *
 * - `SCHEDULED`, `QUALIFIED`, `TRANSFERRED`, `NOT_QUALIFIED`: live human picked
 *   up, lead lands in REACHED with `reachedAt` set.
 * - `NO_ANSWER`: schedule another attempt after `cooldownMinutes` if the budget
 *   is not yet exhausted; otherwise mark ATTEMPTED so the tick loop stops
 *   picking it up.
 * - Anything else (including `null`/`OTHER`): treat as inconclusive ATTEMPTED
 *   with no further retries — we got a connection but no clean outcome signal.
 */
export function nextLeadStateForOutcome(input: LeadTransitionInput): LeadTransition {
  const now = input.now ?? new Date();
  const reachedMax = input.priorAttempts >= input.maxAttempts;

  if (input.outcome === "NO_ANSWER") {
    if (reachedMax) {
      return { status: "ATTEMPTED", outcome: input.outcome, nextEligibleAt: null, reachedAt: null };
    }
    return {
      status: "NO_ANSWER",
      outcome: input.outcome,
      nextEligibleAt: new Date(now.getTime() + input.cooldownMinutes * 60_000),
      reachedAt: null,
    };
  }

  if (
    input.outcome === "SCHEDULED" ||
    input.outcome === "QUALIFIED" ||
    input.outcome === "TRANSFERRED" ||
    input.outcome === "NOT_QUALIFIED"
  ) {
    return { status: "REACHED", outcome: input.outcome, nextEligibleAt: null, reachedAt: now };
  }

  return { status: "ATTEMPTED", outcome: input.outcome, nextEligibleAt: null, reachedAt: null };
}

/**
 * Lead state after the SIP dispatch itself fails (LiveKit/Twilio could not
 * place the outbound INVITE). Failure of the *dispatch* is operationally
 * different from a NO_ANSWER on a real call, but for the lead we treat it the
 * same: retry with cooldown if budget remains, otherwise mark FAILED so the
 * concurrency slot is freed.
 */
export function nextLeadStateForDispatchFailure(input: {
  priorAttempts: number;
  maxAttempts: number;
  cooldownMinutes: number;
  now?: Date;
}): LeadTransition {
  const now = input.now ?? new Date();
  const reachedMax = input.priorAttempts >= input.maxAttempts;
  if (reachedMax) {
    return { status: "FAILED", outcome: null, nextEligibleAt: null, reachedAt: null };
  }
  return {
    status: "NO_ANSWER",
    outcome: null,
    nextEligibleAt: new Date(now.getTime() + input.cooldownMinutes * 60_000),
    reachedAt: null,
  };
}
