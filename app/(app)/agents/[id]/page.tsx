import { PhoneCall, Plus } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/with-org";
import { BusinessHoursSchema } from "@/lib/voice/types";
import { VOICES } from "@/lib/voice/voices";

import { BusinessHoursForm } from "./hours-form";
import { KnowledgeBase } from "./knowledge-base";
import { AgentSettingsForm } from "./settings-form";
import { TestCallButton } from "./test-call-button";
import { VoicePicker } from "./voice-picker";

export default async function AgentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  const db = getDb(session.orgId);

  const agent = await db.agent.findUnique({
    where: { id },
    include: {
      knowledgeDocs: { orderBy: { createdAt: "desc" } },
      phoneNumbers: true,
    },
  });
  if (!agent) notFound();

  const hours = BusinessHoursSchema.safeParse(agent.businessHours);

  return (
    <>
      <PageHeader
        title={agent.name}
        description={`${agent.language === "PT_BR" ? "Português" : agent.language === "EN_US" ? "English" : "Auto"} · ${agent.ttsProvider === "ELEVENLABS" ? "ElevenLabs" : "Cartesia"}`}
        actions={
          <div className="flex items-center gap-2">
            <TestCallButton agentId={agent.id} />
            <Button asChild variant="outline">
              <Link href={`/calls?agentId=${agent.id}`}>
                <PhoneCall className="h-4 w-4" />
                Ver chamadas
              </Link>
            </Button>
          </div>
        }
      />
      <div className="p-8">
        <Tabs defaultValue="persona">
          <TabsList>
            <TabsTrigger value="persona">Persona</TabsTrigger>
            <TabsTrigger value="voice">Voz</TabsTrigger>
            <TabsTrigger value="hours">Horários</TabsTrigger>
            <TabsTrigger value="knowledge">Conhecimento</TabsTrigger>
            <TabsTrigger value="phones">Números</TabsTrigger>
          </TabsList>

          <TabsContent value="persona" className="max-w-2xl">
            <Card className="p-6">
              <AgentSettingsForm
                agent={{
                  id: agent.id,
                  name: agent.name,
                  language: agent.language,
                  personaPrompt: agent.personaPrompt,
                  greeting: agent.greeting,
                  fallbackTransferE164: agent.fallbackTransferE164,
                  enabled: agent.enabled,
                }}
              />
            </Card>
          </TabsContent>

          <TabsContent value="voice" className="max-w-2xl">
            <Card className="p-6">
              <VoicePicker
                agentId={agent.id}
                language={agent.language}
                currentVoiceId={agent.voiceId}
                currentProvider={agent.ttsProvider}
                voices={availableVoices()}
              />
            </Card>
          </TabsContent>

          <TabsContent value="hours" className="max-w-2xl">
            <Card className="p-6">
              <BusinessHoursForm
                agentId={agent.id}
                initial={hours.success ? hours.data : { timezone: "America/Sao_Paulo" }}
              />
            </Card>
          </TabsContent>

          <TabsContent value="knowledge">
            <KnowledgeBase
              agentId={agent.id}
              docs={agent.knowledgeDocs.map((d) => ({
                id: d.id,
                title: d.title,
                body: d.body,
                updatedAt: d.updatedAt.toISOString(),
              }))}
            />
          </TabsContent>

          <TabsContent value="phones" className="max-w-2xl">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Números conectados</CardTitle>
                <Button size="sm" asChild variant="outline">
                  <Link href="/settings/phone-numbers">
                    <Plus className="h-4 w-4" />
                    Conectar
                  </Link>
                </Button>
              </CardHeader>
              <div className="divide-border divide-y">
                {agent.phoneNumbers.length === 0 ? (
                  <p className="text-muted-foreground px-6 py-4 text-sm">
                    Nenhum número apontado pra esse agente.
                  </p>
                ) : (
                  agent.phoneNumbers.map((p) => (
                    <div key={p.id} className="flex items-center justify-between px-6 py-3">
                      <p className="font-mono text-sm">{p.e164}</p>
                      <p className="text-muted-foreground text-xs">{p.label ?? "—"}</p>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

/**
 * The ElevenLabs voices are only offered when the worker has a key. If the
 * env var is unset, we filter them out — preventing a state where the UI sets
 * `ttsProvider = ELEVENLABS` against a worker that can't synthesize.
 */
function availableVoices() {
  const elevenlabsEnabled = Boolean(process.env.ELEVENLABS_API_KEY);
  return elevenlabsEnabled ? VOICES : VOICES.filter((v) => v.provider !== "elevenlabs");
}
