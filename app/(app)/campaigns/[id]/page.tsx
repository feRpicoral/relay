import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { requireSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/with-org";
import { formatPhone } from "@/lib/utils";

import { CampaignActions } from "./actions-bar";

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

const LEAD_LABEL: Record<string, string> = {
  PENDING: "Pendente",
  CALLING: "Ligando",
  ATTEMPTED: "Esgotada",
  REACHED: "Atendeu",
  NO_ANSWER: "Sem resposta",
  VOICEMAIL: "Caixa postal",
  FAILED: "Falhou",
  EXCLUDED: "Excluída",
};

const LEAD_VARIANT: Record<
  string,
  "default" | "secondary" | "success" | "warning" | "destructive"
> = {
  PENDING: "secondary",
  CALLING: "default",
  ATTEMPTED: "secondary",
  REACHED: "success",
  NO_ANSWER: "warning",
  VOICEMAIL: "warning",
  FAILED: "destructive",
  EXCLUDED: "secondary",
};

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  const db = getDb(session.orgId);
  const campaign = await db.campaign.findUnique({
    where: { id },
    include: {
      agent: { select: { name: true } },
      leads: { orderBy: { createdAt: "asc" }, take: 200 },
    },
  });
  if (!campaign) notFound();

  const total = campaign.leads.length;
  const reached = campaign.leads.filter((l) => l.status === "REACHED").length;
  const callsInFlight = campaign.leads.filter((l) => l.status === "CALLING").length;
  const completed = campaign.leads.filter((l) =>
    ["REACHED", "ATTEMPTED", "FAILED", "EXCLUDED"].includes(l.status),
  ).length;
  const progress = total === 0 ? 0 : Math.round((completed / total) * 100);

  return (
    <>
      <PageHeader
        title={campaign.name}
        description={`Agente ${campaign.agent.name} · de ${campaign.fromPhoneNumberE164}`}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={STATUS_VARIANT[campaign.status] ?? "secondary"}>
              {STATUS_LABEL[campaign.status] ?? campaign.status}
            </Badge>
            <CampaignActions campaignId={campaign.id} status={campaign.status} />
          </div>
        }
      />
      <div className="space-y-6 p-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground text-sm font-medium">Progresso</CardTitle>
          </CardHeader>
          <div className="space-y-3 px-6 pb-6">
            <Progress value={progress} />
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Stat label="Total" value={total} />
              <Stat label="Em chamada" value={callsInFlight} />
              <Stat label="Atendidas" value={reached} />
              <Stat label="Restantes" value={total - completed - callsInFlight} />
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Leads</CardTitle>
          </CardHeader>
          <div className="divide-border divide-y">
            {campaign.leads.map((lead) => (
              <div key={lead.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="font-medium">{lead.name ?? formatPhone(lead.phoneE164)}</p>
                  <p className="text-muted-foreground text-xs">
                    {formatPhone(lead.phoneE164)} · tentativas: {lead.attempts}
                  </p>
                </div>
                <Badge variant={LEAD_VARIANT[lead.status] ?? "secondary"}>
                  {LEAD_LABEL[lead.status] ?? lead.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
