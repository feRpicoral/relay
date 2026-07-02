import { Bot } from "lucide-react";
import Link from "next/link";

import { CallStatusBadge } from "@/components/call/call-status-badge";
import { CallOutcomeBadge, SentimentInline } from "@/components/calls/badges";
import type { CallsTableRow } from "@/components/calls/calls-table";
import { DirectionIcon } from "@/components/calls/direction-icon";
import { Card } from "@/components/ui/card";
import { formatDuration } from "@/lib/utils";

export function CallCard({ row }: { row: CallsTableRow }) {
  const metaParts = [row.startedLabel];
  if (row.durationMs != null) metaParts.push(formatDuration(row.durationMs));

  return (
    <Card className="hover:bg-accent/40 transition-colors">
      <Link href={`/calls/${row.id}`} className="block p-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <DirectionIcon direction={row.direction} label={row.directionLabel} />
            <span className="text-foreground truncate font-mono text-[15px] font-semibold">
              {row.peerPhone}
            </span>
          </div>
          <CallStatusBadge status={row.status} className="shrink-0" />
        </div>
        {row.callerName ? (
          <p className="text-muted-foreground mt-1.5 truncate text-xs">{row.callerName}</p>
        ) : null}
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="border-border bg-card/40 text-muted-foreground inline-flex min-w-0 items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs">
            <Bot className="text-primary size-3 shrink-0" />
            <span className="truncate">{row.agentName ?? "—"}</span>
          </span>
          {row.outcome ? <CallOutcomeBadge outcome={row.outcome} className="shrink-0" /> : null}
        </div>
        <div className="text-muted-foreground mt-2.5 flex items-center gap-2 font-mono text-[11px]">
          <span>{metaParts.join(" · ")}</span>
          {row.sentiment ? <SentimentInline sentiment={row.sentiment} /> : null}
        </div>
      </Link>
    </Card>
  );
}
