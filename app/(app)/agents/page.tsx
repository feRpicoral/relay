import { Bot, Plus } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { requireSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/with-org";

export default async function AgentsPage() {
  const session = await requireSession();
  const db = getDb(session.orgId);
  const t = await getTranslations("agents.list");
  const tLanguage = await getTranslations("enums.agentLanguageShort");

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
          <Button asChild>
            <Link href="/agents/new">
              <Plus className="h-4 w-4" />
              {t("newAgent")}
            </Link>
          </Button>
        }
      />
      <div className="p-8">
        {agents.length === 0 ? (
          <Empty
            icon={<Bot className="h-5 w-5" />}
            title={t("empty.title")}
            description={t("empty.description")}
            action={
              <Button asChild>
                <Link href="/agents/new">{t("empty.cta")}</Link>
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {agents.map((a) => (
              <Card
                key={a.id}
                className="hover:border-primary/30 overflow-hidden transition-colors"
              >
                <Link href={`/agents/${a.id}`} className="block p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-lg">
                        <Bot className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold">{a.name}</p>
                        <p className="text-muted-foreground text-xs">
                          {tLanguage(a.language)},{" "}
                          {t("summary", {
                            calls: a._count.calls,
                            docs: a._count.knowledgeDocs,
                          })}
                        </p>
                      </div>
                    </div>
                    <Badge variant={a.enabled ? "success" : "secondary"} className="gap-1.5">
                      {a.enabled ? t("active") : t("paused")}
                    </Badge>
                  </div>
                  {a.phoneNumbers.length > 0 ? (
                    <p className="text-muted-foreground mt-4 font-mono text-xs">
                      {a.phoneNumbers.map((p) => p.e164).join(", ")}
                    </p>
                  ) : (
                    <p className="text-muted-foreground mt-4 text-xs">{t("noNumber")}</p>
                  )}
                </Link>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
