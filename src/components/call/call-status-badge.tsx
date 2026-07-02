"use client";

import { useTranslations } from "next-intl";

import { StatusBadge } from "@/components/ui/status-badge";
import { callStatusVisual } from "@/lib/status-tone";

type CallStatus = "RINGING" | "IN_PROGRESS" | "COMPLETED" | "FAILED" | "NO_ANSWER" | "VOICEMAIL";

export function CallStatusBadge({ status, className }: { status: CallStatus; className?: string }) {
  const t = useTranslations("enums.callStatus");
  const visual = callStatusVisual(status);
  return (
    <StatusBadge label={t(status)} tone={visual.tone} pulse={visual.pulse} className={className} />
  );
}
