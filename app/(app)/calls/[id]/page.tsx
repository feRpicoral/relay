import { Bot, Phone, Sparkles } from "lucide-react";
import { notFound } from "next/navigation";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";

import { CallStatusBadge } from "@/components/call/call-status-badge";
import { ToolTimeline } from "@/components/call/tool-timeline";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { requireSession } from "@/lib/auth/session";
import { outcomeLabel, SENTIMENT_VARIANT, sentimentLabel } from "@/lib/calls/labels";
import { getDb } from "@/lib/db/with-org";
import { cn, currency, formatDuration, formatPhone } from "@/lib/utils";

import { CallDetailBody } from "./detail-body";

export default async function CallDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  const db = getDb(session.orgId);
  const t = await getTranslations("calls.detail");
  const tOutcome = await getTranslations("enums.outcome");
  const tSentiment = await getTranslations("enums.sentiment");
  const formatter = await getFormatter();
  const locale = await getLocale();

  const call = await db.call.findUnique({
    where: { id },
    include: {
      agent: { select: { name: true } },
      transcripts: { orderBy: { startMs: "asc" } },
      toolCalls: { orderBy: { startedAt: "asc" } },
      metrics: { orderBy: { occurredAt: "asc" } },
    },
  });
  if (!call) notFound();

  const isPeerView =
    call.direction === "INBOUND" ? formatPhone(call.callerE164) : formatPhone(call.calleeE164);

  const agentName = call.agent?.name ?? t("agentFallback");
  const dateString = formatter.dateTime(call.startedAt, {
    dateStyle: "long",
    timeStyle: "short",
  });

  return (
    <>
      <PageHeader
        title={isPeerView}
        description={`${agentName}, ${dateString}`}
        actions={<CallStatusBadge status={call.status} />}
      />

      {/* `minmax(0,1fr)` instead of `1fr`: the default `1fr` resolves to
          `minmax(auto, 1fr)`, where `auto` means "at least the intrinsic
          content width". A long unbroken token inside (e.g. the JSON output
          of a tool call) then makes the column grow past the viewport,
          triggering page-level horizontal scroll AND disabling `truncate`
          on descendants. `minmax(0, ...)` lets the column actually shrink. */}
      <div className="grid gap-6 p-8 lg:grid-cols-[minmax(0,1fr)_440px]">
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <SummaryStat
              icon={<Phone className="text-muted-foreground h-4 w-4" />}
              label={t("stat.duration")}
              value={call.durationMs ? formatDuration(call.durationMs) : "-"}
            />
            <SummaryStat
              icon={<Bot className="text-muted-foreground h-4 w-4" />}
              label={t("stat.outcome")}
              value={call.outcome ? outcomeLabel(call.outcome, tOutcome) : "-"}
              badge={
                call.outcome === "SCHEDULED"
                  ? "success"
                  : call.outcome === "TRANSFERRED"
                    ? "warning"
                    : undefined
              }
            />
            <SummaryStat
              icon={<Sparkles className="text-muted-foreground h-4 w-4" />}
              label={t("stat.sentiment")}
              value={call.sentiment ? sentimentLabel(call.sentiment, tSentiment) : "-"}
              badge={call.sentiment ? SENTIMENT_VARIANT[call.sentiment] : undefined}
            />
          </div>

          {call.summary ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
                  <Sparkles className="h-3.5 w-3.5" />
                  {t("aiSummary")}
                </CardTitle>
              </CardHeader>
              <div className="px-6 pb-6">
                <p className="text-foreground text-sm leading-relaxed">{call.summary}</p>
                {call.topics.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {call.topics.map((topic) => (
                      <Badge key={topic} variant="outline" className="text-xs">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                ) : null}
                {call.costCents != null ? (
                  <p className="text-muted-foreground mt-3 text-xs">
                    {t("estimatedCost", {
                      amount: currency(call.costCents, "USD", locale),
                    })}
                  </p>
                ) : null}
              </div>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-muted-foreground text-sm font-medium">
                  {t("aiSummary")}
                </CardTitle>
              </CardHeader>
              <div className="text-muted-foreground px-6 pb-6 text-sm">
                {call.processedAt ? t("summaryUnavailable") : t("summaryProcessing")}
              </div>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-muted-foreground text-sm font-medium">
                {t("toolsUsed")}
              </CardTitle>
            </CardHeader>
            <div className="px-6 pb-6">
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
        </div>

        <div className="space-y-6">
          <Card className="flex h-[640px] flex-col overflow-hidden">
            <CardHeader>
              <CardTitle className="text-muted-foreground text-sm font-medium">
                {t("transcript")}
              </CardTitle>
            </CardHeader>
            <Separator />
            <CallDetailBody
              recordingUrl={call.recordingUrl}
              transcripts={call.transcripts.map((tr) => ({
                id: tr.id,
                speaker: tr.speaker,
                text: tr.text,
                startMs: tr.startMs,
                endMs: tr.endMs,
                sentiment: tr.sentiment,
              }))}
            />
          </Card>
        </div>
      </div>
    </>
  );
}

function SummaryStat({
  icon,
  label,
  value,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  badge?: "success" | "secondary" | "destructive" | "warning";
}) {
  return (
    <Card>
      <div className="flex items-start justify-between p-5">
        <div>
          <p className="text-muted-foreground text-xs">{label}</p>
          <p className="mt-1 text-lg font-semibold">{value}</p>
        </div>
        <div className={cn("border-border bg-card/40 rounded-md border p-2", badge && "")}>
          {icon}
        </div>
      </div>
    </Card>
  );
}
