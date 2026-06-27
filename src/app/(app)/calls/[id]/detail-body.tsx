"use client";

import { Play } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useState } from "react";

import { AudioPlayer } from "@/components/call/audio-player";
import { TranscriptHistory } from "@/components/call/transcript-history";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatTimestamp } from "@/lib/utils";

interface DetailBodyProps {
  kpis: ReactNode;
  summary: ReactNode;
  tools: ReactNode;
  recordingUrl: string | null;
  recordingMeta: string | null;
  transcripts: Array<{
    id: string;
    speaker: "USER" | "AGENT" | "SYSTEM";
    text: string;
    startMs: number;
    endMs: number;
    sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE" | "MIXED" | null;
  }>;
}

export function CallDetailBody({
  kpis,
  summary,
  tools,
  recordingUrl,
  recordingMeta,
  transcripts,
}: DetailBodyProps) {
  const t = useTranslations("calls.detail");
  const [currentMs, setCurrentMs] = useState(0);
  const hasActivePlayhead = currentMs > 0;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_432px] lg:items-start">
      <div className="flex flex-col gap-4">
        {kpis}
        {summary}
        {tools}
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-2 p-4 pb-3">
            <CardTitle className="text-sm font-semibold">{t("recording.title")}</CardTitle>
            {recordingMeta ? (
              <span className="text-muted-foreground font-mono text-[11px]">
                {t("recording.meta", { duration: recordingMeta })}
              </span>
            ) : null}
          </CardHeader>
          <div className="px-4 pb-4">
            <AudioPlayer src={recordingUrl} onTimeUpdate={setCurrentMs} />
          </div>
        </Card>
      </div>

      <Card className="flex h-[640px] flex-col overflow-hidden">
        <CardHeader className="flex-row items-center justify-between gap-2 p-4 pb-3">
          <CardTitle className="text-sm font-semibold">{t("transcript.title")}</CardTitle>
          {hasActivePlayhead ? (
            <span className="text-muted-foreground inline-flex items-center gap-1.5 text-[11px]">
              <Play className="text-primary size-2.5" />
              {t("transcript.synced", { time: formatTimestamp(currentMs) })}
            </span>
          ) : null}
        </CardHeader>
        <Separator />
        <div className="min-h-0 flex-1 overflow-hidden">
          <TranscriptHistory rows={transcripts} currentMs={currentMs} />
        </div>
      </Card>
    </div>
  );
}
