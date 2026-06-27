import {
  Bot,
  ChevronLeft,
  Clock,
  CreditCard,
  Loader2,
  Smile,
  Sparkles,
  Target,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { CallStatusBadge } from "@/components/call/call-status-badge";
import { ToolTimeline } from "@/components/call/tool-timeline";
import { CallOutcomeBadge, SentimentBadge } from "@/components/calls/badges";
import { DirectionChip } from "@/components/calls/direction-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiTile } from "@/components/ui/kpi-tile";
import { requireSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/with-org";
import { formatCostUsdBrl, formatDuration, formatPhone } from "@/lib/utils";

import { CallDetailBody } from "./detail-body";
import { SummaryRefreshButton } from "./summary-refresh";

const EMPTY_VALUE = "—";

export default async function CallDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  const db = getDb(session.orgId);
  const t = await getTranslations("calls.detail");
  const tDirection = await getTranslations("enums.callDirection");
  const formatter = await getFormatter();
  const locale = await getLocale();

  const call = await db.call.findUnique({
    where: { id },
    include: {
      agent: { select: { id: true, name: true } },
      campaignAttempt: { select: { lead: { select: { name: true } } } },
      transcripts: { orderBy: { startMs: "asc" } },
      toolCalls: { orderBy: { startedAt: "asc" } },
    },
  });
  if (!call) notFound();

  const peerPhone =
    call.direction === "INBOUND" ? formatPhone(call.callerE164) : formatPhone(call.calleeE164);
  const callerName = call.campaignAttempt?.lead.name ?? null;
  const agentName = call.agent?.name ?? t("agentFallback");
  const dateString = formatter.dateTime(call.startedAt, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const kpis: ReactNode = (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <KpiTile
        icon={<Clock className="size-3.5" />}
        label={t("stat.duration")}
        value={call.durationMs != null ? formatDuration(call.durationMs) : EMPTY_VALUE}
      />
      <KpiTile
        icon={<Target className="size-3.5" />}
        label={t("stat.outcome")}
        mono={false}
        value={
          call.outcome ? <CallOutcomeBadge outcome={call.outcome} /> : <span>{EMPTY_VALUE}</span>
        }
      />
      <KpiTile
        icon={<Smile className="size-3.5" />}
        label={t("stat.sentiment")}
        mono={false}
        value={
          call.sentiment ? (
            <SentimentBadge sentiment={call.sentiment} />
          ) : (
            <span>{EMPTY_VALUE}</span>
          )
        }
      />
      <KpiTile
        icon={<CreditCard className="size-3.5" />}
        label={t("stat.cost")}
        value={call.costCents != null ? formatCostUsdBrl(call.costCents, locale) : EMPTY_VALUE}
      />
    </div>
  );

  const summary: ReactNode = (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2 p-4 pb-3">
        <CardTitle className="text-primary flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="size-4" />
          <span className="text-foreground">{t("aiSummary")}</span>
        </CardTitle>
        <Badge variant="secondary" className="px-2 py-0 text-[10px] font-normal">
          {t("postCall")}
        </Badge>
      </CardHeader>
      {call.summary ? (
        <div className="px-4 pb-4">
          <p className="text-foreground text-sm leading-relaxed">{call.summary}</p>
          {call.topics.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {call.topics.map((topic) => (
                <Badge key={topic} variant="outline" className="text-xs font-normal">
                  {topic}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
      ) : call.processedAt == null ? (
        <div className="flex items-start gap-3 px-4 pb-4">
          <span className="bg-secondary text-muted-foreground flex size-11 shrink-0 items-center justify-center rounded-xl">
            <Loader2 className="size-5 animate-spin" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-foreground text-sm font-semibold">{t("summaryProcessing.title")}</p>
            <p className="text-muted-foreground mt-0.5 text-sm">
              {t("summaryProcessing.description")}
            </p>
          </div>
          <SummaryRefreshButton />
        </div>
      ) : (
        <div className="flex items-start gap-3 px-4 pb-4">
          <span className="bg-secondary text-muted-foreground flex size-11 shrink-0 items-center justify-center rounded-xl">
            <Sparkles className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-foreground text-sm font-semibold">{t("summaryUnavailable.title")}</p>
            <p className="text-muted-foreground mt-0.5 text-sm">
              {t("summaryUnavailable.description")}
            </p>
          </div>
        </div>
      )}
    </Card>
  );

  const tools: ReactNode = (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2 p-4 pb-3">
        <CardTitle className="text-muted-foreground flex items-center gap-2 text-sm font-semibold">
          <Bot className="size-4" />
          <span className="text-foreground">{t("toolTimeline.title")}</span>
        </CardTitle>
        <span className="text-muted-foreground font-mono text-[11px]">
          {t("toolTimeline.count", { count: call.toolCalls.length })}
        </span>
      </CardHeader>
      <div className="px-4 pb-4">
        <ToolTimeline
          callId={call.id}
          initial={call.toolCalls.map((tc) => ({
            id: tc.id,
            name: tc.name,
            inputJson: tc.inputJson as Record<string, unknown>,
            outputJson: tc.outputJson as Record<string, unknown> | null,
            errorMessage: tc.errorMessage,
            startedAt: tc.startedAt.toISOString(),
            endedAt: tc.endedAt?.toISOString() ?? null,
            durationMs: tc.durationMs,
          }))}
        />
      </div>
    </Card>
  );

  const recordingMeta =
    call.recordingUrl && call.durationMs != null ? formatDuration(call.durationMs) : null;

  return (
    <>
      <div className="border-border flex items-start justify-between gap-4 border-b px-6 py-5 md:px-8">
        <div className="flex min-w-0 items-start gap-3">
          <Button asChild variant="outline" size="icon-sm" className="mt-0.5 shrink-0">
            <Link href="/calls" aria-label={t("back")}>
              <ChevronLeft className="size-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-foreground font-mono text-lg font-semibold">{peerPhone}</span>
              <DirectionChip direction={call.direction} label={tDirection(call.direction)} />
              <CallStatusBadge status={call.status} />
            </div>
            <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-2 text-xs">
              {callerName ? <span>{callerName}</span> : null}
              <span className="border-border bg-card/40 inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5">
                <Bot className="text-primary size-3" />
                {agentName}
              </span>
              <span className="font-mono">{dateString}</span>
            </div>
          </div>
        </div>
        {call.agent ? (
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <Link href={`/agents/${call.agent.id}`}>{t("viewAgent")}</Link>
          </Button>
        ) : null}
      </div>

      <div className="p-6 md:p-8">
        <CallDetailBody
          kpis={kpis}
          summary={summary}
          tools={tools}
          recordingUrl={call.recordingUrl}
          recordingMeta={recordingMeta}
          transcripts={call.transcripts.map((tr) => ({
            id: tr.id,
            speaker: tr.speaker,
            text: tr.text,
            startMs: tr.startMs,
            endMs: tr.endMs,
            sentiment: tr.sentiment,
          }))}
        />
      </div>
    </>
  );
}
