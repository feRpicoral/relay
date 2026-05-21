"use client";

import { useEffect, useMemo, useRef } from "react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { useRealtimeList } from "@/hooks/use-realtime";
import { cn } from "@/lib/utils";

interface TranscriptRow {
  id: string;
  call_id: string;
  speaker: "USER" | "AGENT" | "SYSTEM";
  text: string;
  start_ms: number;
  end_ms: number;
  is_final: boolean;
  created_at: string;
}

interface TranscriptStreamProps {
  callId: string;
  initial: Array<{
    id: string;
    speaker: "USER" | "AGENT" | "SYSTEM";
    text: string;
    startMs: number;
    endMs: number;
    isFinal: boolean;
    createdAt: string;
  }>;
}

export function TranscriptStream({ callId, initial }: TranscriptStreamProps) {
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
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
        Aguardando primeira fala...
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div ref={scrollRef} className="space-y-3 p-4">
        {rows.map((row) => (
          <TranscriptTurn key={row.id} row={row} />
        ))}
      </div>
    </ScrollArea>
  );
}

function TranscriptTurn({ row }: { row: TranscriptRow }) {
  const isAgent = row.speaker === "AGENT";
  const isSystem = row.speaker === "SYSTEM";
  if (isSystem) {
    return <p className="text-muted-foreground text-center text-xs">{row.text}</p>;
  }
  return (
    <div
      className={cn(
        "max-w-[88%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
        isAgent
          ? "bg-primary/90 text-primary-foreground ml-auto rounded-tr-md"
          : "bg-secondary text-secondary-foreground mr-auto rounded-tl-md",
        !row.is_final && "opacity-70",
      )}
    >
      <p
        className={cn(
          "mb-0.5 text-[10px] font-medium tracking-wider uppercase",
          isAgent ? "text-primary-foreground/60" : "text-muted-foreground",
        )}
      >
        {isAgent ? "Agente" : "Cliente"}, {formatTimestamp(row.start_ms)}
        {!row.is_final ? ", ao vivo" : null}
      </p>
      <p>{row.text}</p>
    </div>
  );
}

function formatTimestamp(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}
