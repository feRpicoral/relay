"use client";

import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";

type CallStatus = "RINGING" | "IN_PROGRESS" | "COMPLETED" | "FAILED" | "NO_ANSWER" | "VOICEMAIL";

const variants: Record<
  CallStatus,
  "default" | "secondary" | "destructive" | "success" | "warning" | "outline"
> = {
  RINGING: "warning",
  IN_PROGRESS: "default",
  COMPLETED: "success",
  FAILED: "destructive",
  NO_ANSWER: "secondary",
  VOICEMAIL: "secondary",
};

export function CallStatusBadge({ status }: { status: CallStatus }) {
  const t = useTranslations("enums.callStatus");
  return (
    <Badge variant={variants[status]} className="gap-1.5">
      {status === "IN_PROGRESS" || status === "RINGING" ? (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
        </span>
      ) : null}
      {t(status)}
    </Badge>
  );
}
