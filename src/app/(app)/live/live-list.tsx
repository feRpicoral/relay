"use client";

import { AlertTriangle, PhoneCall, RefreshCw, Speech } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import { DirectionChip } from "@/components/calls/direction-icon";
import { MiniWaveform } from "@/components/live/mini-waveform";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dot } from "@/components/ui/dot";
import { StateCard } from "@/components/ui/state-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { useRealtimeList } from "@/hooks/use-realtime";
import { callStatusVisual } from "@/lib/status-tone";
import { cn, formatPhone } from "@/lib/utils";

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

const GRID_COLS = "md:grid-cols-[130px_minmax(0,1.6fr)_minmax(0,1fr)_130px_120px_auto]";

/** Surfaced in the channel-error diagnostic line, matching the design copy. */
const CHANNEL_LABEL = "livekit_room";

export function LiveCallsList({ orgId, initial }: { orgId: string; initial: CallRow[] }) {
  const [channelError, setChannelError] = useState(false);
  // Remounting the subscriber re-runs the realtime effect — the retry path.
  const [attempt, setAttempt] = useState(0);

  return (
    <LiveCallsListInner
      key={attempt}
      orgId={orgId}
      initial={initial}
      channelError={channelError}
      onChannelError={setChannelError}
      onRetry={() => {
        setChannelError(false);
        setAttempt((n) => n + 1);
      }}
    />
  );
}

function LiveCallsListInner({
  orgId,
  initial,
  channelError,
  onChannelError,
  onRetry,
}: {
  orgId: string;
  initial: CallRow[];
  channelError: boolean;
  onChannelError: (errored: boolean) => void;
  onRetry: () => void;
}) {
  const t = useTranslations("calls.live");
  const rows = useRealtimeList<CallRow>({
    table: "calls",
    filter: `org_id=eq.${orgId}`,
    channelKey: `live-list:${orgId}`,
    initial,
    onChannelError,
  });

  const active = useMemo(
    () => rows.filter((c) => c.status === "RINGING" || c.status === "IN_PROGRESS"),
    [rows],
  );
  const inProgressCount = active.filter((c) => c.status === "IN_PROGRESS").length;
  const ringingCount = active.filter((c) => c.status === "RINGING").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-2">
            <Dot tone="primary" />
            {t.rich("inProgress", { count: inProgressCount, b: countChunk })}
          </span>
          <span className="flex items-center gap-2">
            <Dot tone="warning" />
            {t.rich("ringing", { count: ringingCount, b: countChunk })}
          </span>
        </div>
        <span className="text-muted-foreground border-border bg-card/40 inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs">
          <RefreshCw className="size-3" />
          {t("autoRefresh")}
        </span>
      </div>

      {channelError ? (
        <StateCard
          icon={<AlertTriangle />}
          iconTone="destructive"
          title={t("channelError.title")}
          description={t("channelError.description")}
          actions={
            <>
              <Button variant="outline" onClick={onRetry}>
                <RefreshCw className="size-3.5" />
                {t("channelError.retry")}
              </Button>
              <p className="text-muted-foreground mt-3 w-full font-mono text-[11px]">
                {t("channelError.stream", { channel: CHANNEL_LABEL })}
              </p>
            </>
          }
        />
      ) : active.length === 0 ? (
        <StateCard
          icon={<PhoneCall />}
          iconTone="muted"
          title={t("empty.title")}
          description={t("empty.description")}
          actions={
            <span className="text-muted-foreground bg-secondary inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs">
              <Dot tone="success" pulse />
              {t("empty.watching")}
            </span>
          }
          bordered
        />
      ) : (
        <Card className="overflow-hidden">
          <div
            className={cn(
              "text-muted-foreground hidden gap-4 border-b px-5 py-2.5 text-[11px] font-medium tracking-wide uppercase md:grid",
              GRID_COLS,
            )}
          >
            <span>{t("columns.status")}</span>
            <span>{t("columns.caller")}</span>
            <span>{t("columns.agent")}</span>
            <span>{t("columns.live")}</span>
            <span>{t("columns.metrics")}</span>
            <span className="sr-only">{t("monitor")}</span>
          </div>
          <ul className="divide-border divide-y">
            {active.map((c) => (
              <LiveRow key={c.id} row={c} />
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function countChunk(chunks: ReactNode) {
  return <b className="font-mono font-semibold">{chunks}</b>;
}

function LiveRow({ row }: { row: CallRow }) {
  const t = useTranslations("calls.live");
  const tStatus = useTranslations("enums.callStatus");
  const tDirection = useTranslations("enums.callDirection");
  const visual = callStatusVisual(row.status);
  const isRinging = row.status === "RINGING";
  const phone = formatPhone(row.direction === "INBOUND" ? row.caller_e164 : row.callee_e164);
  const now = useNow();
  const elapsedMs = now - new Date(row.started_at).getTime();

  return (
    <li
      className={cn(
        "grid grid-cols-1 gap-3 border-l-2 px-5 py-4 md:items-center md:gap-4",
        GRID_COLS,
        isRinging ? "border-l-warning/60" : "border-l-primary/60",
      )}
    >
      <div>
        <StatusBadge label={tStatus(row.status)} tone={visual.tone} pulse={visual.pulse} />
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-semibold">{phone}</span>
          <DirectionChip direction={row.direction} label={tDirection(row.direction)} />
        </div>
      </div>

      <div className="text-muted-foreground border-border bg-card/40 inline-flex w-fit items-center gap-1.5 rounded-md border px-2 py-1 text-xs">
        <Speech className="text-primary size-3" />
        <span className="truncate">{row.agent_name ?? "—"}</span>
      </div>

      <div className="flex flex-col gap-1">
        {isRinging ? (
          <span className="text-warning inline-flex items-center gap-1.5 text-xs font-medium">
            <Dot tone="warning" pulse />
            {t("ringingLabel")}
          </span>
        ) : (
          <MiniWaveform />
        )}
      </div>

      <div>
        <span className="font-mono text-sm font-semibold">{formatClock(elapsedMs)}</span>
        <span className="mt-0.5 flex items-center gap-1.5">
          <Dot tone="muted" className="size-1.5" />
          <span className="text-muted-foreground font-mono text-[11px]">—</span>
        </span>
      </div>

      <div className="md:justify-self-end">
        <Button asChild size="sm">
          <Link href={`/calls/${row.id}/live`}>
            <Speech className="size-3.5" />
            {t("monitor")}
          </Link>
        </Button>
      </div>
    </li>
  );
}

function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

const CLOCK_TICK_MS = 1000;

/** Ticking wall clock so live durations stay current without per-row timers. */
function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), CLOCK_TICK_MS);
    return () => clearInterval(id);
  }, []);
  return now;
}
