import { Bot, Lock } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { AgentCard } from "@/components/agents/agent-card";
import { NewAgentButton } from "@/components/agents/new-agent-button";
import { PageHeader } from "@/components/page-header";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { StateCard } from "@/components/ui/state-card";
import { requireSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/with-org";

export default async function AgentsPage() {
  const session = await requireSession();
  const db = getDb(session.orgId);
  const t = await getTranslations("agents.list");

  const isAdmin = session.role === "ADMIN";

  const agents = await db.agent.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { calls: true, knowledgeDocs: true } },
      phoneNumbers: { select: { e164: true } },
    },
  });

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <>
            {!isAdmin ? (
              <span className="border-border bg-secondary text-muted-foreground inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-semibold">
                <Lock className="size-3" />
                {t("member.label")}
              </span>
            ) : null}
            <NewAgentButton canCreate={isAdmin} />
          </>
        }
      />
      {agents.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-8">
          <StateCard
            icon={<Bot />}
            title={t("empty.title")}
            description={t("empty.description")}
            actions={
              isAdmin ? (
                <Button asChild>
                  <Link href="/agents/new">{t("empty.cta")}</Link>
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="space-y-4 p-6 md:p-8">
          {!isAdmin ? (
            <Banner icon={<Lock />} className="text-muted-foreground">
              {t("member.banner")}
            </Banner>
          ) : null}
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {agents.map((a) => (
              <AgentCard
                key={a.id}
                agent={{
                  id: a.id,
                  name: a.name,
                  language: a.language,
                  voiceId: a.voiceId,
                  enabled: a.enabled,
                  callCount: a._count.calls,
                  docCount: a._count.knowledgeDocs,
                  phoneNumbers: a.phoneNumbers.map((p) => p.e164),
                }}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
