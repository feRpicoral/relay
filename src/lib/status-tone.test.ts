import { describe, expect, it } from "vitest";

import {
  bookingStatusKey,
  bookingStatusVisual,
  callOutcomeVisual,
  callStatusVisual,
  campaignLeadStatusVisual,
  campaignStatusVisual,
  sentimentVisual,
} from "@/lib/status-tone";

describe("status-tone", () => {
  it("maps in-flight states to a pulsing tone", () => {
    expect(callStatusVisual("RINGING")).toEqual({ tone: "warning", pulse: true });
    expect(callStatusVisual("IN_PROGRESS")).toEqual({ tone: "primary", pulse: true });
    expect(campaignStatusVisual("RUNNING")).toEqual({ tone: "primary", pulse: true });
    expect(campaignLeadStatusVisual("CALLING")).toEqual({ tone: "primary", pulse: true });
  });

  it("maps terminal success/failure states to semantic tones", () => {
    expect(callStatusVisual("COMPLETED").tone).toBe("success");
    expect(callStatusVisual("FAILED").tone).toBe("destructive");
    expect(callOutcomeVisual("SCHEDULED").tone).toBe("success");
    expect(callOutcomeVisual("NOT_QUALIFIED").tone).toBe("destructive");
    expect(sentimentVisual("NEGATIVE").tone).toBe("destructive");
    expect(sentimentVisual("MIXED").tone).toBe("warning");
  });

  it("falls back to muted for unknown values", () => {
    expect(callStatusVisual("WAT")).toEqual({ tone: "muted" });
    expect(campaignLeadStatusVisual("")).toEqual({ tone: "muted" });
  });

  it("maps Cal.com booking statuses to tones case-insensitively", () => {
    expect(bookingStatusVisual("ACCEPTED").tone).toBe("success");
    expect(bookingStatusVisual("confirmed").tone).toBe("success");
    expect(bookingStatusVisual("pending").tone).toBe("warning");
    expect(bookingStatusVisual("cancelled").tone).toBe("destructive");
    expect(bookingStatusVisual("rejected").tone).toBe("destructive");
    expect(bookingStatusVisual("weird").tone).toBe("muted");
  });

  it("collapses booking statuses to the three display keys", () => {
    expect(bookingStatusKey("ACCEPTED")).toBe("confirmed");
    expect(bookingStatusKey("rejected")).toBe("cancelled");
    expect(bookingStatusKey("pending")).toBe("pending");
    expect(bookingStatusKey("anything-else")).toBe("unknown");
  });
});
