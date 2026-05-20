import { Megaphone, Plus } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { requireSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/with-org";

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "success" | "warning" | "destructive"
> = {
  DRAFT: "secondary",
  RUNNING: "default",
  PAUSED: "warning",
  COMPLETED: "success",
  CANCELED: "destructive",
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Rascunho",
  RUNNING: "Rodando",
  PAUSED: "Pausada",
  COMPLETED: "Concluída",
  CANCELED: "Cancelada",
};

export default async function CampaignsPage() {
  const session = await requireSession();
  const db = getDb(session.orgId);
  const campaigns = await db.campaign.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      agent: { select: { name: true } },
      _count: { select: { leads: true, attempts: true } },
    },
  });

  return (
    <>
      <PageHeader
        title="Campanhas"
        description="Listas de leads que seus agentes ligam de forma automatizada."
        actions={
          <Button asChild>
            <Link href="/campaigns/new">
              <Plus className="h-4 w-4" />
              Nova campanha
            </Link>
          </Button>
        }
      />
      <div className="p-8">
        {campaigns.length === 0 ? (
          <Empty
            icon={<Megaphone className="h-5 w-5" />}
            title="Nenhuma campanha ainda"
            description="Crie uma lista de leads e configure o agente que vai ligar."
            action={
              <Button asChild>
                <Link href="/campaigns/new">Criar campanha</Link>
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {campaigns.map((c) => (
              <Card
                key={c.id}
                className="hover:border-primary/30 overflow-hidden transition-colors"
              >
                <Link href={`/campaigns/${c.id}`} className="block p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{c.name}</p>
                      <p className="text-muted-foreground text-xs">
                        Agente {c.agent.name} · {c._count.leads} leads · {c._count.attempts}{" "}
                        tentativas
                      </p>
                    </div>
                    <Badge variant={STATUS_VARIANT[c.status] ?? "secondary"}>
                      {STATUS_LABEL[c.status] ?? c.status}
                    </Badge>
                  </div>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
