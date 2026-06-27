"use client";

import { Bot, Frown, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef } from "react";

import { Badge } from "@/components/ui/badge";
import { Dot } from "@/components/ui/dot";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRealtimeList } from "@/hooks/use-realtime";
import { cn, formatTimestamp } from "@/lib/utils";

type Sentiment = "POSITIVE" | "NEUTRAL" | "NEGATIVE" | "MIXED";

interface TranscriptRow {
  id: string;
  call_id: string;
  speaker: "USER" | "AGENT" | "SYSTEM";
  text: string;
  start_ms: number;
  end_ms: number;
  is_final: boolean;
  sentiment: Sentiment | null;
  created_at: string;
}

type TranscriptPhase = "connecting" | "awaiting" | "streaming";

interface TranscriptStreamProps {
  callId: string;
  phase: TranscriptPhase;
  initial: Array<{
    id: string;
    speaker: "USER" | "AGENT" | "SYSTEM";
    text: string;
    startMs: number;
    endMs: number;
    isFinal: boolean;
    sentiment: Sentiment | null;
    createdAt: string;
  }>;
}

export function TranscriptStream({ callId, phase, initial }: TranscriptStreamProps) {
  const t = useTranslations("calls.liveDetail");
  const initialRows: TranscriptRow[] = useMemo(
    () =>
      initial.map((r) => ({
        id: r.id,
        call_id: callId,
        speaker: r.speaker,
        text: r.text,
        start_ms: r.startMs,
        end_ms: r.endMs,
        is_final: r.isFinal,
        sentiment: r.sentiment,
        created_at: r.createdAt,
      })),
    [initial, callId],
  );

  const rows = useRealtimeList<TranscriptRow>({
    table: "transcripts",
    filter: `call_id=eq.${callId}`,
    channelKey: `transcript-stream:${callId}`,
    initial: initialRows,
  });

  const scrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [rows.length]);

  if (rows.length === 0) {
    const isConnecting = phase === "connecting";
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2.5 px-6 py-10 text-center">
        <Dot tone={isConnecting ? "warning" : "success"} pulse className="size-2.5" />
        <p className="text-muted-foreground max-w-[280px] text-sm">
          {isConnecting ? t("transcriptConnecting") : t("awaitingUtterance")}
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div ref={scrollRef} className="space-y-2.5 p-4">
        {rows.map((row) => (
          <TranscriptTurn key={row.id} row={row} />
        ))}
      </div>
    </ScrollArea>
  );
}

function TranscriptTurn({ row }: { row: TranscriptRow }) {
  const t = useTranslations("calls.liveDetail");
  const tSentiment = useTranslations("enums.sentiment");

  if (row.speaker === "SYSTEM") {
    return <p className="text-muted-foreground text-center text-xs">{row.text}</p>;
  }

  const isAgent = row.speaker === "AGENT";
  const isNegative = row.sentiment === "NEGATIVE";
  const isInterim = !row.is_final;

  return (
    <div className={cn("flex", isAgent ? "justify-start" : "justify-end")}>
      <div
        className={cn(
          "max-w-[88%] rounded-2xl border px-3.5 py-2.5 text-sm leading-relaxed",
          isAgent
            ? "bg-secondary text-secondary-foreground border-transparent"
            : "bg-card text-card-foreground border-border",
          isNegative && "border-destructive/40 bg-destructive/5",
          isInterim && "border-dashed opacity-80",
        )}
      >
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1 text-[10px] font-semibold tracking-wide uppercase",
              isAgent ? "text-primary" : "text-muted-foreground",
            )}
          >
            {isAgent ? <Bot className="size-3" /> : <User className="size-3" />}
            {isAgent ? t("agent") : t("caller")}
          </span>
          <span className="text-muted-foreground font-mono text-[10px]">
            {formatTimestamp(row.start_ms)}
          </span>
          {isNegative ? (
            <Badge variant="destructive" className="gap-1 px-1.5 py-0 text-[9px] uppercase">
              <Frown className="size-2.5" />
              {tSentiment("NEGATIVE")}
            </Badge>
          ) : null}
          {isInterim ? (
            <Badge
              variant="outline"
              className="text-muted-foreground border-dashed px-1.5 py-0 text-[9px] uppercase"
            >
              {t("interim")}
            </Badge>
          ) : null}
        </div>
        <p className={cn(isInterim && "text-muted-foreground italic")}>
          {row.text}
          {isInterim ? (
            <span className="bg-foreground/70 ml-0.5 inline-block h-3 w-[2px] animate-pulse align-middle" />
          ) : null}
        </p>
      </div>
    </div>
  );
}
