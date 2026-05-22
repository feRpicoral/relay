import { PhoneCall, Plus } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/with-org";
import { listCartesiaVoices } from "@/lib/voice/cartesia-voices";
import { BusinessHoursSchema } from "@/lib/voice/types";

import { BusinessHoursForm } from "./hours-form";
import { KnowledgeBase } from "./knowledge-base";
import { AgentSettingsForm } from "./settings-form";
import { TestCallButton } from "./test-call-button";
import { VoicePicker } from "./voice-picker";

export default async function AgentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  const db = getDb(session.orgId);
  const t = await getTranslations("agents.detail");
  const tLanguage = await getTranslations("enums.agentLanguageShort");

  const agent = await db.agent.findUnique({
    where: { id },
    include: {
      knowledgeDocs: { orderBy: { createdAt: "desc" } },
      phoneNumbers: true,
    },
  });
  if (!agent) notFound();

  const hours = BusinessHoursSchema.safeParse(agent.businessHours);
  const ttsProvider = agent.ttsProvider === "ELEVENLABS" ? "ElevenLabs" : "Cartesia";

  return (
    <>
      <PageHeader
        title={agent.name}
        description={`${tLanguage(agent.language)}, ${ttsProvider}`}
        actions={
          <div className="flex items-center gap-2">
            <TestCallButton agentId={agent.id} />
            <Button asChild variant="outline">
              <Link href={`/calls?agentId=${agent.id}`}>
                <PhoneCall className="h-4 w-4" />
                {t("viewCalls")}
              </Link>
            </Button>
          </div>
        }
      />
      <div className="p-8">
        <Tabs defaultValue="persona">
          <TabsList>
            <TabsTrigger value="persona">{t("tabs.persona")}</TabsTrigger>
            <TabsTrigger value="voice">{t("tabs.voice")}</TabsTrigger>
            <TabsTrigger value="hours">{t("tabs.hours")}</TabsTrigger>
            <TabsTrigger value="knowledge">{t("tabs.knowledge")}</TabsTrigger>
            <TabsTrigger value="phones">{t("tabs.phones")}</TabsTrigger>
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
                voices={await loadCartesiaVoicesForLang(agent.language)}
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
                <CardTitle>{t("phones.title")}</CardTitle>
                <Button size="sm" asChild variant="outline">
                  <Link href="/settings/telephony">
                    <Plus className="h-4 w-4" />
                    {t("phones.connect")}
                  </Link>
                </Button>
              </CardHeader>
              <div className="divide-border divide-y">
                {agent.phoneNumbers.length === 0 ? (
                  <p className="text-muted-foreground px-6 py-4 text-sm">{t("phones.empty")}</p>
                ) : (
                  agent.phoneNumbers.map((p) => (
                    <div key={p.id} className="flex items-center justify-between px-6 py-3">
                      <p className="font-mono text-sm">{p.e164}</p>
                      <p className="text-muted-foreground text-xs">{p.label ?? "-"}</p>
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
 * env var is unset, we filter them out, preventing a state where the UI sets
 * `ttsProvider = ELEVENLABS` against a worker that can't synthesize.
 */
async function loadCartesiaVoicesForLang(language: "PT_BR" | "EN_US" | "AUTO") {
  const langPrefix = language === "EN_US" ? "en" : "pt";
  const voices = await listCartesiaVoices({ language: langPrefix });
  // AUTO falls back to pt-br voices for now since that's the primary use case;
  // the agent picks language at conversation start regardless.
  return voices.map((v) => ({
    provider: "cartesia" as const,
    voiceId: v.id,
    label: v.label,
    language: language === "EN_US" ? ("en-US" as const) : ("pt-BR" as const),
    gender: (v.gender as "female" | "male" | "neutral") ?? "neutral",
    description: v.description ?? undefined,
  }));
}
