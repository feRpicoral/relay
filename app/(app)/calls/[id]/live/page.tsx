import { notFound } from "next/navigation";

import { CallStatusBadge } from "@/components/call/call-status-badge";
import { LatencyMeter } from "@/components/call/latency-meter";
import { LiveCallListener } from "@/components/call/live-call-listener";
import { ToolTimeline } from "@/components/call/tool-timeline";
import { TranscriptStream } from "@/components/call/transcript-stream";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { requireSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/with-org";
import { optionalEnv } from "@/lib/env";
import { formatPhone } from "@/lib/utils";
import { issueParticipantToken } from "@/lib/voice/livekit";

import { HangupButton } from "./hangup-button";

export default async function LiveCallPage({ params }: { params: Promise<{ id: string }> }) {
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

  const livekitUrl = optionalEnv("LIVEKIT_URL") ?? null;
  let listenerToken: string | null = null;
  if (livekitUrl && call.livekitRoomName) {
    try {
      listenerToken = await issueParticipantToken({
        roomName: call.livekitRoomName,
        identity: `monitor-${session.userId}`,
        canPublish: false,
        canSubscribe: true,
        ttlSeconds: 3600,
      });
    } catch {
      listenerToken = null;
    }
  }

  const active = call.status === "RINGING" || call.status === "IN_PROGRESS";

  return (
    <>
      <PageHeader
        title={call.direction === "INBOUND" ? "Chamada recebida" : "Chamada de saída"}
        description={`${formatPhone(call.direction === "INBOUND" ? call.callerE164 : call.calleeE164)}, ${call.agent?.name ?? "Agente"}`}
        actions={
          <div className="flex items-center gap-2">
            <CallStatusBadge status={call.status} />
            {active ? <HangupButton callId={call.id} /> : null}
          </div>
        }
      />
      <div className="grid gap-6 p-8 lg:grid-cols-[1fr_440px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-muted-foreground text-sm font-medium">
                  Waveform ao vivo
                </CardTitle>
                <Badge variant="outline" className="text-[10px]">
                  {call.livekitRoomName ?? "no room"}
                </Badge>
              </div>
            </CardHeader>
            <div className="px-6 pb-6">
              <LiveCallListener
                livekitUrl={livekitUrl}
                roomName={call.livekitRoomName}
                token={listenerToken}
                active={active}
              />
            </div>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-muted-foreground text-sm font-medium">
                Latência por leg
              </CardTitle>
            </CardHeader>
            <div className="px-6 pb-6">
              <LatencyMeter
                callId={call.id}
                orgId={call.orgId}
                initial={call.metrics.map((m) => ({
                  id: m.id,
                  leg: m.leg,
                  valueMs: m.valueMs,
                  occurredAt: m.occurredAt.toISOString(),
                }))}
              />
            </div>
          </Card>
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

        <Card className="flex h-[640px] flex-col">
          <CardHeader>
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Transcrição ao vivo
            </CardTitle>
          </CardHeader>
          <Separator />
          <div className="flex-1 overflow-hidden">
            <TranscriptStream
              callId={call.id}
              orgId={call.orgId}
              initial={call.transcripts.map((t) => ({
                id: t.id,
                speaker: t.speaker,
                text: t.text,
                startMs: t.startMs,
                endMs: t.endMs,
                isFinal: t.isFinal,
                createdAt: t.createdAt.toISOString(),
              }))}
            />
          </div>
        </Card>
      </div>
    </>
  );
}
