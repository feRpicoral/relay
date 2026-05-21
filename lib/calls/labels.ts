/**
 * Display labels and Badge variants for Call outcome/sentiment enums. Same
 * co-location rationale as campaigns/labels.
 */
import type { CallOutcome, Sentiment } from "@prisma/client";

/** Sentiment never resolves to a "default" badge — keep this narrow so the
 * SummaryStat consumer's union accepts it without further casting. */
type SentimentBadge = "secondary" | "success" | "warning" | "destructive";

export const OUTCOME_LABEL: Record<CallOutcome, string> = {
  SCHEDULED: "Agendou",
  QUALIFIED: "Qualificou",
  TRANSFERRED: "Transferiu",
  NOT_QUALIFIED: "Não qualificou",
  NO_ANSWER: "Não atendeu",
  OTHER: "Outro",
};

export const SENTIMENT_LABEL: Record<Sentiment, string> = {
  POSITIVE: "Positivo",
  NEUTRAL: "Neutro",
  NEGATIVE: "Negativo",
  MIXED: "Misto",
};

export const SENTIMENT_VARIANT: Record<Sentiment, SentimentBadge> = {
  POSITIVE: "success",
  NEUTRAL: "secondary",
  NEGATIVE: "destructive",
  MIXED: "warning",
};
