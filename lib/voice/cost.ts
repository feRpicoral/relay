interface CostInput {
  durationMs: number;
  ttsProvider: "cartesia" | "elevenlabs";
  language: "pt-BR" | "en-US" | "auto";
}

/**
 * Rough per-call cost estimation in USD cents. Real billing reconciles against
 * provider invoices monthly. These numbers come from DECISIONS.md #14.
 */
const RATES_PER_MIN_CENTS = {
  twilio: 1.0,
  livekit: 2.0,
  deepgram: 0.8,
  anthropic: 2.5,
  cartesia: 3.0,
  elevenlabs: 8.0,
};

export function estimateCallCostCents(input: CostInput): number {
  const minutes = input.durationMs / 60_000;
  const ttsRate =
    input.ttsProvider === "elevenlabs"
      ? RATES_PER_MIN_CENTS.elevenlabs
      : RATES_PER_MIN_CENTS.cartesia;
  const total =
    minutes *
    (RATES_PER_MIN_CENTS.twilio +
      RATES_PER_MIN_CENTS.livekit +
      RATES_PER_MIN_CENTS.deepgram +
      RATES_PER_MIN_CENTS.anthropic +
      ttsRate);
  return Math.max(1, Math.round(total));
}
