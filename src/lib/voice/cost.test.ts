import { describe, expect, it } from "vitest";

import { estimateCallCostCents } from "./cost";

// Per-minute rates (cents) from cost.ts — duplicated here intentionally as a
// pinning reference so a silent rate change in source breaks this test.
const TWILIO = 1.0;
const LIVEKIT = 2.0;
const DEEPGRAM = 0.8;
const ANTHROPIC = 2.5;
const CARTESIA = 3.0;
const ELEVENLABS = 8.0;

describe("estimateCallCostCents", () => {
  it("returns at least 1 cent floor for sub-minute calls", () => {
    const zero = estimateCallCostCents({
      durationMs: 0,
      ttsProvider: "cartesia",
      language: "pt-BR",
    });
    const tiny = estimateCallCostCents({
      durationMs: 100,
      ttsProvider: "cartesia",
      language: "pt-BR",
    });

    expect(zero).toBe(1);
    expect(tiny).toBe(1);
  });

  it("uses the cartesia rate when ttsProvider is cartesia", () => {
    const expected = Math.round(TWILIO + LIVEKIT + DEEPGRAM + ANTHROPIC + CARTESIA);

    const actual = estimateCallCostCents({
      durationMs: 60_000,
      ttsProvider: "cartesia",
      language: "pt-BR",
    });

    expect(actual).toBe(expected);
  });

  it("uses the elevenlabs rate when ttsProvider is elevenlabs (more expensive)", () => {
    const expected = Math.round(TWILIO + LIVEKIT + DEEPGRAM + ANTHROPIC + ELEVENLABS);

    const actual = estimateCallCostCents({
      durationMs: 60_000,
      ttsProvider: "elevenlabs",
      language: "pt-BR",
    });

    expect(actual).toBe(expected);
  });

  it("elevenlabs is strictly more expensive than cartesia for the same call", () => {
    const cartesia = estimateCallCostCents({
      durationMs: 60_000,
      ttsProvider: "cartesia",
      language: "pt-BR",
    });
    const elevenlabs = estimateCallCostCents({
      durationMs: 60_000,
      ttsProvider: "elevenlabs",
      language: "pt-BR",
    });

    expect(elevenlabs).toBeGreaterThan(cartesia);
  });

  it("scales roughly linearly with duration", () => {
    const oneMin = estimateCallCostCents({
      durationMs: 60_000,
      ttsProvider: "cartesia",
      language: "pt-BR",
    });
    const tenMin = estimateCallCostCents({
      durationMs: 600_000,
      ttsProvider: "cartesia",
      language: "pt-BR",
    });

    // Allow for sub-cent rounding error in `oneMin` getting amplified by 10x.
    // 1 min = 9.3¢ rounds to 9¢; 10 min = 93¢ stays at 93¢, diff = 3.
    expect(Math.abs(tenMin - oneMin * 10)).toBeLessThanOrEqual(5);
  });

  it("language does not affect cost (cartesia)", () => {
    const a = estimateCallCostCents({
      durationMs: 60_000,
      ttsProvider: "cartesia",
      language: "pt-BR",
    });
    const b = estimateCallCostCents({
      durationMs: 60_000,
      ttsProvider: "cartesia",
      language: "en-US",
    });
    const c = estimateCallCostCents({
      durationMs: 60_000,
      ttsProvider: "cartesia",
      language: "auto",
    });

    expect(a).toBe(b);
    expect(b).toBe(c);
  });
});
