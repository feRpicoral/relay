import { Bot, Phone, Sparkles } from "lucide-react";
import { notFound } from "next/navigation";

import { CallStatusBadge } from "@/components/call/call-status-badge";
import { ToolTimeline } from "@/components/call/tool-timeline";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { requireSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/with-org";
import { cn, currency, formatDuration, formatPhone } from "@/lib/utils";

import { CallDetailBody } from "./detail-body";

const OUTCOME_LABEL: Record<string, string> = {
  SCHEDULED: "Agendou",
  QUALIFIED: "Qualificou",
  TRANSFERRED: "Transferiu",
  NOT_QUALIFIED: "Não qualificou",
  NO_ANSWER: "Não atendeu",
  OTHER: "Outro",
};

const SENTIMENT_LABEL: Record<string, string> = {
  POSITIVE: "Positivo",
  NEUTRAL: "Neutro",
  NEGATIVE: "Negativo",
  MIXED: "Misto",
};

const SENTIMENT_VARIANT: Record<string, "success" | "secondary" | "destructive" | "warning"> = {
  POSITIVE: "success",
  NEUTRAL: "secondary",
  NEGATIVE: "destructive",
  MIXED: "warning",
};

export default async function CallDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  const db = getDb(session.orgId);

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

  return (
    <>
      <PageHeader
        title={isPeerView}
        description={`${call.agent?.name ?? "Agente"} · ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeStyle: "short" }).format(call.startedAt)}`}
        actions={<CallStatusBadge status={call.status} />}
      />

      <div className="grid gap-6 p-8 lg:grid-cols-[1fr_440px]">
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <SummaryStat
              icon={<Phone className="text-muted-foreground h-4 w-4" />}
              label="Duração"
              value={call.durationMs ? formatDuration(call.durationMs) : "—"}
            />
            <SummaryStat
              icon={<Bot className="text-muted-foreground h-4 w-4" />}
              label="Desfecho"
              value={call.outcome ? (OUTCOME_LABEL[call.outcome] ?? call.outcome) : "—"}
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
              label="Sentimento"
              value={call.sentiment ? (SENTIMENT_LABEL[call.sentiment] ?? call.sentiment) : "—"}
              badge={call.sentiment ? SENTIMENT_VARIANT[call.sentiment] : undefined}
            />
          </div>

          {call.summary ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
                  <Sparkles className="h-3.5 w-3.5" />
                  Resumo IA
                </CardTitle>
              </CardHeader>
              <div className="px-6 pb-6">
                <p className="text-foreground text-sm leading-relaxed">{call.summary}</p>
                {call.topics.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {call.topics.map((t) => (
                      <Badge key={t} variant="outline" className="text-xs">
                        {t}
                      </Badge>
                    ))}
                  </div>
                ) : null}
                {call.costCents != null ? (
                  <p className="text-muted-foreground mt-3 text-xs">
                    Custo estimado: {currency(call.costCents, "USD")}
                  </p>
                ) : null}
              </div>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-muted-foreground text-sm font-medium">
                  Resumo IA
                </CardTitle>
              </CardHeader>
              <div className="text-muted-foreground px-6 pb-6 text-sm">
                {call.processedAt
                  ? "Sem resumo disponível."
                  : "Processando resumo no momento — atualize em alguns segundos."}
              </div>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-muted-foreground text-sm font-medium">
                Ferramentas usadas
              </CardTitle>
            </CardHeader>
            <div className="px-6 pb-6">
              <ToolTimeline
                callId={call.id}
                orgId={call.orgId}
                initial={call.toolCalls.map((t) => ({
                  id: t.id,
                  name: t.name,
                  inputJson: t.inputJson as Record<string, unknown>,
                  outputJson: t.outputJson as Record<string, unknown> | null,
                  errorMessage: t.errorMessage,
                  startedAt: t.startedAt.toISOString(),
                  endedAt: t.endedAt?.toISOString() ?? null,
                  durationMs: t.durationMs,
                }))}
              />
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="flex h-[640px] flex-col overflow-hidden">
            <CardHeader>
              <CardTitle className="text-muted-foreground text-sm font-medium">
                Transcrição
              </CardTitle>
            </CardHeader>
            <Separator />
            <CallDetailBody
              recordingUrl={call.recordingUrl}
              transcripts={call.transcripts.map((t) => ({
                id: t.id,
                speaker: t.speaker,
                text: t.text,
                startMs: t.startMs,
                endMs: t.endMs,
                sentiment: t.sentiment,
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
