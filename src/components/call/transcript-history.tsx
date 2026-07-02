"use client";

import { Bot, Play, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";

import { Badge } from "@/components/ui/badge";
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
  const t = useTranslations("calls.detail.transcript");
  const tSentiment = useTranslations("enums.sentiment");
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

  if (rows.length === 0) {
    return <p className="text-muted-foreground p-4 text-sm">{t("empty")}</p>;
  }

  return (
    <ScrollArea className="h-full">
      <div ref={scrollRef} className="space-y-2.5 p-4">
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
          const isNegative = row.sentiment === "NEGATIVE";
          return (
            <div
              key={row.id}
              data-turn-id={row.id}
              className={cn("flex", isAgent ? "justify-start" : "justify-end")}
            >
              <div
                className={cn(
                  "max-w-[88%] rounded-2xl border px-3.5 py-2.5 text-sm leading-relaxed transition-all",
                  isAgent
                    ? "bg-secondary text-secondary-foreground border-transparent"
                    : "bg-card text-card-foreground border-border",
                  isNegative && "border-destructive/40 bg-destructive/5",
                  isActive && "ring-primary/40 ring-2",
                )}
              >
                <div className="mb-1 flex items-center gap-2">
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
                    {formatTimestamp(row.startMs)}
                  </span>
                  {isNegative ? (
                    <Badge variant="destructive" className="px-1.5 py-0 text-[9px] uppercase">
                      {tSentiment("NEGATIVE")}
                    </Badge>
                  ) : null}
                  {isActive ? (
                    <span className="text-primary inline-flex items-center gap-0.5 text-[10px] font-medium">
                      <Play className="size-2.5" />
                      {t("now")}
                    </span>
                  ) : null}
                </div>
                <p>{row.text}</p>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
