"use client";

import Link from "next/link";
import { useMemo } from "react";

import { CallStatusBadge } from "@/components/call/call-status-badge";
import { Card } from "@/components/ui/card";
import { useRealtimeList } from "@/hooks/use-realtime";
import { formatPhone } from "@/lib/utils";

interface CallRow {
  id: string;
  org_id: string;
  agent_name: string | null;
  caller_e164: string;
  callee_e164: string;
  direction: "INBOUND" | "OUTBOUND";
  status: "RINGING" | "IN_PROGRESS" | "COMPLETED" | "FAILED" | "NO_ANSWER" | "VOICEMAIL";
  started_at: string;
}

export function LiveCallsList({ orgId, initial }: { orgId: string; initial: CallRow[] }) {
  const rows = useRealtimeList<CallRow>({
    table: "calls",
    filter: `org_id=eq.${orgId}`,
    initial,
  });

  const active = useMemo(
    () => rows.filter((c) => c.status === "RINGING" || c.status === "IN_PROGRESS"),
    [rows],
  );

  if (active.length === 0) return null;

  return (
    <Card className="overflow-hidden">
      <div className="divide-border divide-y">
        {active.map((c) => (
          <Link
            key={c.id}
            href={`/calls/${c.id}/live`}
            className="hover:bg-accent/40 flex items-center justify-between gap-4 px-5 py-4 transition-colors"
          >
            <div className="flex items-center gap-4">
              <CallStatusBadge status={c.status} />
              <div>
                <p className="font-medium">
                  {c.direction === "INBOUND"
                    ? formatPhone(c.caller_e164)
                    : formatPhone(c.callee_e164)}
                </p>
                <p className="text-muted-foreground text-xs">
                  {c.agent_name ?? "-"}, {c.direction === "INBOUND" ? "Recebida" : "Realizada"} ,{" "}
                  {new Date(c.started_at).toLocaleTimeString("pt-BR", { hour12: false })}
                </p>
              </div>
            </div>
            <span className="text-muted-foreground text-xs">Ver ao vivo</span>
          </Link>
        ))}
      </div>
    </Card>
  );
}
