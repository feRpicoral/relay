import { notFound } from "next/navigation";

import { LatencyMeter } from "@/components/call/latency-meter";
import { LiveCallListener } from "@/components/call/live-call-listener";
import { TestCallSession } from "@/components/call/test-call-session";
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

import { LiveStatusActions } from "./live-status-actions";

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
  // Test calls (no real PSTN caller) need the operator's browser to publish
  // mic audio into the room — otherwise the worker has nothing to react to.
  // We detect by the placeholder callerE164 set in lib/voice/test-call.ts.
  const isTestCall = call.callerE164 === "+0000000TEST";

  let lkToken: string | null = null;
  if (livekitUrl && call.livekitRoomName) {
    try {
      lkToken = await issueParticipantToken({
        roomName: call.livekitRoomName,
        identity: isTestCall ? `tester-${session.userId}` : `monitor-${session.userId}`,
        canPublish: isTestCall,
        canSubscribe: true,
        ttlSeconds: 3600,
      });
    } catch {
      lkToken = null;
    }
  }

  const active = call.status === "RINGING" || call.status === "IN_PROGRESS";

  return (
    <>
      <PageHeader
        title={call.direction === "INBOUND" ? "Chamada recebida" : "Chamada de saída"}
        description={`${formatPhone(call.direction === "INBOUND" ? call.callerE164 : call.calleeE164)}, ${call.agent?.name ?? "Agente"}`}
        actions={<LiveStatusActions callId={call.id} initialStatus={call.status} />}
      />
      {/* `minmax(0,1fr)` instead of `1fr`: see /calls/[id]/page.tsx for the
          long-form reasoning. Short version — `1fr` is `minmax(auto, 1fr)`
          and `auto` honors intrinsic content width, so a long unbroken JSON
          string in a tool output makes the column blow past the viewport. */}
      <div className="grid gap-6 p-8 lg:grid-cols-[minmax(0,1fr)_440px]">
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
              {isTestCall ? (
                <TestCallSession
                  livekitUrl={livekitUrl}
                  roomName={call.livekitRoomName}
                  token={lkToken}
                  active={active}
                />
              ) : (
                <LiveCallListener
                  livekitUrl={livekitUrl}
                  roomName={call.livekitRoomName}
                  token={lkToken}
                  active={active}
                />
              )}
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
          {/* `min-h-0` is required, not optional: flex children default to
              min-height:auto and refuse to shrink below content, which defeats
              `overflow-hidden` and lets the transcript list push the card past
              640px → page-level vertical scroll once messages pile up. */}
          <div className="min-h-0 flex-1 overflow-hidden">
            <TranscriptStream
              callId={call.id}
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
