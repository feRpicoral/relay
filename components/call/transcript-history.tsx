"use client";

import { useEffect, useRef } from "react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { cn, formatTimestamp } from "@/lib/utils";

interface Row {
  id: string;
  speaker: "USER" | "AGENT" | "SYSTEM";
  text: string;
  startMs: number;
  endMs: number;
  sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE" | "MIXED" | null;
}

interface TranscriptHistoryProps {
  rows: Row[];
  currentMs?: number;
}

export function TranscriptHistory({ rows, currentMs }: TranscriptHistoryProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const activeId =
    currentMs == null
      ? null
      : (rows.find((r) => currentMs >= r.startMs && currentMs <= r.endMs)?.id ?? null);

  useEffect(() => {
    if (!activeId) return;
    const el = scrollRef.current?.querySelector(`[data-turn-id="${activeId}"]`);
    if (el && "scrollIntoView" in el) {
      (el as HTMLElement).scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [activeId]);

  return (
    <ScrollArea className="h-full">
      <div ref={scrollRef} className="space-y-3 p-4">
        {rows.map((row) => {
          if (row.speaker === "SYSTEM") {
            return (
              <p key={row.id} className="text-muted-foreground text-center text-xs">
                {row.text}
              </p>
            );
          }
          const isAgent = row.speaker === "AGENT";
          const isActive = row.id === activeId;
          return (
            <div
              key={row.id}
              data-turn-id={row.id}
              className={cn(
                "max-w-[88%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed transition-all",
                isAgent
                  ? "bg-primary/90 text-primary-foreground ml-auto rounded-tr-md"
                  : "bg-secondary text-secondary-foreground mr-auto rounded-tl-md",
                isActive && "ring-primary/40 ring-2",
                row.sentiment === "NEGATIVE" && "border-destructive/30",
              )}
            >
              <p
                className={cn(
                  "mb-0.5 text-[10px] font-medium tracking-wider uppercase",
                  isAgent ? "text-primary-foreground/60" : "text-muted-foreground",
                )}
              >
                {isAgent ? "Agente" : "Cliente"}, {formatTimestamp(row.startMs)}
                {row.sentiment && row.sentiment !== "NEUTRAL"
                  ? `, ${row.sentiment.toLowerCase()}`
                  : null}
              </p>
              <p>{row.text}</p>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
