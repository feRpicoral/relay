import { describe, expect, it } from "vitest";

import { nextLeadStateForDispatchFailure, nextLeadStateForOutcome } from "./campaign-lead-state";

const NOW = new Date("2026-05-22T10:00:00Z");

describe("nextLeadStateForOutcome", () => {
  it("marks reached for SCHEDULED/QUALIFIED/TRANSFERRED/NOT_QUALIFIED", () => {
    const outcomes = ["SCHEDULED", "QUALIFIED", "TRANSFERRED", "NOT_QUALIFIED"] as const;

    const results = outcomes.map((outcome) =>
      nextLeadStateForOutcome({
        outcome,
        priorAttempts: 1,
        maxAttempts: 3,
        cooldownMinutes: 60,
        now: NOW,
      }),
    );

    for (const result of results) {
      expect(result.status).toBe("REACHED");
      expect(result.reachedAt).toEqual(NOW);
      expect(result.nextEligibleAt).toBeNull();
    }
  });

  it("schedules a retry on NO_ANSWER when attempts remain", () => {
    const result = nextLeadStateForOutcome({
      outcome: "NO_ANSWER",
      priorAttempts: 1,
      maxAttempts: 3,
      cooldownMinutes: 30,
      now: NOW,
    });

    expect(result.status).toBe("NO_ANSWER");
    expect(result.reachedAt).toBeNull();
    expect(result.nextEligibleAt).toEqual(new Date(NOW.getTime() + 30 * 60_000));
  });

  it("stops retrying NO_ANSWER once the budget is spent", () => {
    const result = nextLeadStateForOutcome({
      outcome: "NO_ANSWER",
      priorAttempts: 3,
      maxAttempts: 3,
      cooldownMinutes: 30,
      now: NOW,
    });

    expect(result.status).toBe("ATTEMPTED");
    expect(result.nextEligibleAt).toBeNull();
  });

  it("falls back to ATTEMPTED with no retry on OTHER/null", () => {
    const outcomes = ["OTHER", null] as const;

    const results = outcomes.map((outcome) =>
      nextLeadStateForOutcome({
        outcome,
        priorAttempts: 1,
        maxAttempts: 3,
        cooldownMinutes: 60,
        now: NOW,
      }),
    );

    for (const result of results) {
      expect(result.status).toBe("ATTEMPTED");
      expect(result.reachedAt).toBeNull();
      expect(result.nextEligibleAt).toBeNull();
    }
  });
});

describe("nextLeadStateForDispatchFailure", () => {
  it("schedules a cooldown retry while attempts remain", () => {
    const result = nextLeadStateForDispatchFailure({
      priorAttempts: 1,
      maxAttempts: 3,
      cooldownMinutes: 15,
      now: NOW,
    });

    expect(result.status).toBe("NO_ANSWER");
    expect(result.nextEligibleAt).toEqual(new Date(NOW.getTime() + 15 * 60_000));
  });

  it("marks FAILED once retries are exhausted so concurrency frees up", () => {
    const result = nextLeadStateForDispatchFailure({
      priorAttempts: 3,
      maxAttempts: 3,
      cooldownMinutes: 15,
      now: NOW,
    });

    expect(result.status).toBe("FAILED");
    expect(result.nextEligibleAt).toBeNull();
  });
});
