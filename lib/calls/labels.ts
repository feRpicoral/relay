/**
 * Translator-aware label helpers for the Call outcome/sentiment enums.
 * The visual `*_VARIANT` mapping stays a const record because Badge variants
 * are styling, not copy. Translation keys live in `messages/*.json` under
 * `enums.outcome.*` / `enums.sentiment.*` / `enums.callStatus.*` /
 * `enums.callDirection.*`.
 */
import type { CallDirection, CallOutcome, CallStatus, Sentiment } from "@prisma/client";

/**
 * The next-intl translator returned by `useTranslations(namespace)` /
 * `getTranslations(namespace)` is typed against the keys in that namespace.
 * We accept the runtime callable shape here so each helper can be invoked
 * with the namespace-scoped translator without TS narrowing complaints.
 */
type EnumTranslator<Keys extends string> = (key: Keys) => string;

/** Sentiment never resolves to a "default" badge — keep this narrow so the
 * SummaryStat consumer's union accepts it without further casting. */
type SentimentBadge = "secondary" | "success" | "warning" | "destructive";

export const SENTIMENT_VARIANT: Record<Sentiment, SentimentBadge> = {
  POSITIVE: "success",
  NEUTRAL: "secondary",
  NEGATIVE: "destructive",
  MIXED: "warning",
};

export function outcomeLabel(outcome: CallOutcome, t: EnumTranslator<CallOutcome>): string {
  return t(outcome);
}

export function sentimentLabel(sentiment: Sentiment, t: EnumTranslator<Sentiment>): string {
  return t(sentiment);
}

export function callStatusLabel(status: CallStatus, t: EnumTranslator<CallStatus>): string {
  return t(status);
}

export function callDirectionLabel(
  direction: CallDirection,
  t: EnumTranslator<CallDirection>,
): string {
  return t(direction);
}
