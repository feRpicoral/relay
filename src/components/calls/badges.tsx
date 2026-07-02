"use client";

import { useTranslations } from "next-intl";

import { Dot } from "@/components/ui/dot";
import { StatusBadge } from "@/components/ui/status-badge";
import { callOutcomeVisual, sentimentVisual } from "@/lib/status-tone";
import { cn } from "@/lib/utils";

type Outcome = "SCHEDULED" | "QUALIFIED" | "TRANSFERRED" | "NOT_QUALIFIED" | "NO_ANSWER" | "OTHER";
type Sentiment = "POSITIVE" | "NEUTRAL" | "NEGATIVE" | "MIXED";

export function CallOutcomeBadge({ outcome, className }: { outcome: Outcome; className?: string }) {
  const t = useTranslations("enums.outcome");
  const visual = callOutcomeVisual(outcome);
  return <StatusBadge label={t(outcome)} tone={visual.tone} className={className} />;
}

export function SentimentBadge({
  sentiment,
  className,
}: {
  sentiment: Sentiment;
  className?: string;
}) {
  const t = useTranslations("enums.sentiment");
  const visual = sentimentVisual(sentiment);
  return <StatusBadge label={t(sentiment)} tone={visual.tone} className={className} />;
}

export function SentimentInline({
  sentiment,
  className,
}: {
  sentiment: Sentiment;
  className?: string;
}) {
  const t = useTranslations("enums.sentiment");
  const visual = sentimentVisual(sentiment);
  return (
    <span className={cn("text-foreground inline-flex items-center gap-1.5 text-xs", className)}>
      <Dot tone={visual.tone} />
      {t(sentiment)}
    </span>
  );
}
