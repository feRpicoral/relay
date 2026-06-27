import { describe, expect, it } from "vitest";

import { LEG_BUDGET_MS } from "@/lib/constants";

import { aggregateLeg, endToEndHealth, groupByLeg } from "./latency";

describe("aggregateLeg", () => {
  it("returns null for an empty series", () => {
    const result = aggregateLeg([], "END_TO_END");

    expect(result).toBeNull();
  });

  it("uses the most recent sample for last and flags over-budget against the leg budget", () => {
    const budget = LEG_BUDGET_MS.END_TO_END;

    const within = aggregateLeg([100, 200, budget - 1], "END_TO_END");
    const over = aggregateLeg([100, 200, budget + 50], "END_TO_END");

    expect(within?.last).toBe(budget - 1);
    expect(within?.overBudget).toBe(false);
    expect(over?.overBudget).toBe(true);
  });

  it("caps the track fill at 100 percent when last exceeds budget", () => {
    const result = aggregateLeg([LEG_BUDGET_MS.LLM_TTFT * 3], "LLM_TTFT");

    expect(result?.fillPercent).toBe(100);
  });

  it("computes p95 from the sorted distribution", () => {
    const values = Array.from({ length: 20 }, (_, i) => (i + 1) * 10);

    const result = aggregateLeg(values, "STT_FINALIZE");

    expect(result?.p95).toBe(200);
  });
});

describe("groupByLeg", () => {
  it("buckets values per leg and drops unknown legs", () => {
    const groups = groupByLeg([
      { leg: "END_TO_END", value_ms: 100 },
      { leg: "END_TO_END", value_ms: 200 },
      { leg: "LLM_TTFT", value_ms: 50 },
      { leg: "BOGUS", value_ms: 999 },
    ]);

    expect(groups.get("END_TO_END")).toEqual([100, 200]);
    expect(groups.get("LLM_TTFT")).toEqual([50]);
    expect(groups.has("BOGUS" as never)).toBe(false);
  });
});

describe("endToEndHealth", () => {
  it("reports no data when the end-to-end leg is missing", () => {
    const health = endToEndHealth(groupByLeg([{ leg: "LLM_TTFT", value_ms: 100 }]));

    expect(health.hasData).toBe(false);
    expect(health.overBudget).toBe(false);
    expect(health.budget).toBe(LEG_BUDGET_MS.END_TO_END);
  });

  it("flags degraded when the latest end-to-end sample is over budget", () => {
    const health = endToEndHealth(
      groupByLeg([
        { leg: "END_TO_END", value_ms: 400 },
        { leg: "END_TO_END", value_ms: LEG_BUDGET_MS.END_TO_END + 280 },
      ]),
    );

    expect(health.hasData).toBe(true);
    expect(health.overBudget).toBe(true);
    expect(health.last).toBe(LEG_BUDGET_MS.END_TO_END + 280);
  });

  it("stays healthy when the latest sample is within budget", () => {
    const health = endToEndHealth(
      groupByLeg([{ leg: "END_TO_END", value_ms: LEG_BUDGET_MS.END_TO_END - 100 }]),
    );

    expect(health.overBudget).toBe(false);
  });
});
