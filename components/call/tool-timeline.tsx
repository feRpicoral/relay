"use client";

import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useMemo } from "react";

import { useRealtimeList } from "@/hooks/use-realtime";
import { cn } from "@/lib/utils";

interface ToolRow {
  id: string;
  call_id: string;
  name: string;
  input_json: Record<string, unknown>;
  output_json: Record<string, unknown> | null;
  error_message: string | null;
  started_at: string;
  ended_at: string | null;
  duration_ms: number | null;
}

interface ToolTimelineProps {
  callId: string;
  orgId: string;
  initial: Array<{
    id: string;
    name: string;
    inputJson: Record<string, unknown>;
    outputJson: Record<string, unknown> | null;
    errorMessage: string | null;
    startedAt: string;
    endedAt: string | null;
    durationMs: number | null;
  }>;
}

export function ToolTimeline({ callId, orgId, initial }: ToolTimelineProps) {
  const initialRows: ToolRow[] = useMemo(
    () =>
      initial.map((r) => ({
        id: r.id,
        call_id: callId,
        name: r.name,
        input_json: r.inputJson,
        output_json: r.outputJson,
        error_message: r.errorMessage,
        started_at: r.startedAt,
        ended_at: r.endedAt,
        duration_ms: r.durationMs,
      })),
    [initial, callId],
  );

  const rows = useRealtimeList<ToolRow>({
    table: "tool_calls",
    filter: `org_id=eq.${orgId}`,
    initial: initialRows,
  }).filter((r) => r.call_id === callId);

  if (rows.length === 0) {
    return <p className="text-muted-foreground text-sm">Nenhuma ferramenta usada nesta chamada.</p>;
  }

  return (
    <div className="space-y-2">
      {rows.map((tool) => {
        const pending = !tool.ended_at;
        const failed = tool.error_message != null;
        return (
          <div
            key={tool.id}
            className={cn(
              "border-border bg-card/40 flex items-start gap-3 rounded-md border px-3 py-2.5 text-sm",
              failed && "border-destructive/40",
            )}
          >
            <div className="mt-0.5">
              {pending ? (
                <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
              ) : failed ? (
                <XCircle className="text-destructive h-4 w-4" />
              ) : (
                <CheckCircle2 className="text-success h-4 w-4" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <code className="text-foreground font-mono text-xs">{tool.name}</code>
                {tool.duration_ms != null ? (
                  <span className="text-muted-foreground text-[10px]">{tool.duration_ms}ms</span>
                ) : null}
              </div>
              {failed ? (
                <p className="text-destructive mt-1 text-xs">{tool.error_message}</p>
              ) : tool.output_json ? (
                <p className="text-muted-foreground mt-1 truncate font-mono text-xs">
                  {JSON.stringify(tool.output_json).slice(0, 120)}
                </p>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
