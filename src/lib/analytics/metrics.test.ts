import { describe, expect, it } from "vitest";

import { type CallRow, computePeriodMetrics, deltaPct, deltaPoints, quantile } from "./metrics";

function call(overrides: Partial<CallRow>): CallRow {
  return { status: "COMPLETED", outcome: null, durationMs: null, costCents: null, ...overrides };
}

describe("computePeriodMetrics", () => {
  it("returns zeroed metrics for an empty period", () => {
    const result = computePeriodMetrics([], []);

    expect(result).toEqual({
      totalCalls: 0,
      attendanceRate: 0,
      conversionRate: 0,
      avgHandleTimeMs: 0,
      totalCostCents: 0,
      latencyP50: 0,
      latencyP95: 0,
    });
  });

  it("counts answered calls toward attendance and averages handle time over answered only", () => {
    const calls = [
      call({ status: "COMPLETED", durationMs: 60_000 }),
      call({ status: "IN_PROGRESS", durationMs: 40_000 }),
      call({ status: "NO_ANSWER", durationMs: 0 }),
      call({ status: "FAILED" }),
    ];

    const result = computePeriodMetrics(calls, []);

    expect(result.totalCalls).toBe(4);
    expect(result.attendanceRate).toBe(0.5);
    expect(result.avgHandleTimeMs).toBe(50_000);
  });

  it("treats scheduled and qualified outcomes as conversions", () => {
    const calls = [
      call({ outcome: "SCHEDULED" }),
      call({ outcome: "QUALIFIED" }),
      call({ outcome: "NOT_QUALIFIED" }),
      call({ outcome: null }),
    ];

    const result = computePeriodMetrics(calls, []);

    expect(result.conversionRate).toBe(0.5);
  });

  it("sums cost and computes latency quantiles from samples", () => {
    const calls = [call({ costCents: 1200 }), call({ costCents: 800 })];
    const samples = [100, 200, 300, 400, 900];

    const result = computePeriodMetrics(calls, samples);

    expect(result.totalCostCents).toBe(2000);
    expect(result.latencyP50).toBe(300);
    expect(result.latencyP95).toBe(800);
  });
});

describe("deltaPct", () => {
  it("computes rounded percentage change", () => {
    expect(deltaPct(110, 100)).toBe(10);
    expect(deltaPct(90, 100)).toBe(-10);
  });

  it("returns 0 when the previous period was empty", () => {
    expect(deltaPct(50, 0)).toBe(0);
  });
});

describe("deltaPoints", () => {
  it("computes whole-point difference between rates", () => {
    expect(deltaPoints(0.89, 0.87)).toBe(2);
    expect(deltaPoints(0.3, 0.33)).toBe(-3);
  });
});

describe("quantile", () => {
  it("interpolates between samples", () => {
    expect(quantile([10, 20, 30, 40], 0.5)).toBe(25);
  });

  it("returns 0 for an empty set", () => {
    expect(quantile([], 0.95)).toBe(0);
  });
});
