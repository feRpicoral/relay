import { ArrowUpRight, Bot, Phone, PhoneCall } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/with-org";
import { daysAgo } from "@/lib/utils";

export default async function DashboardPage() {
  const session = await requireSession();
  const db = getDb(session.orgId);

  const [callsToday, agentCount, phoneCount] = await Promise.all([
    db.call.count({
      where: { startedAt: { gte: daysAgo(1) } },
    }),
    db.agent.count(),
    db.phoneNumber.count(),
  ]);

  return (
    <>
      <PageHeader
        title={`Olá, ${session.userName ?? session.email.split("@")[0]}`}
        description={`Visão geral da ${session.orgName}`}
        actions={
          <Button asChild>
            <Link href="/agents/new">
              <Bot className="h-4 w-4" />
              Novo agente
            </Link>
          </Button>
        }
      />
      <div className="grid gap-4 p-8 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Chamadas hoje
            </CardTitle>
            <PhoneCall className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{callsToday}</div>
            <p className="text-muted-foreground mt-1 text-xs">Últimas 24 horas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Agentes ativos
            </CardTitle>
            <Bot className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{agentCount}</div>
            <p className="text-muted-foreground mt-1 text-xs">Persona + voz + KB</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Linhas conectadas
            </CardTitle>
            <Phone className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{phoneCount}</div>
            <p className="text-muted-foreground mt-1 text-xs">Números Twilio / SIP</p>
          </CardContent>
        </Card>
      </div>

      {agentCount === 0 || phoneCount === 0 ? (
        <div className="grid gap-4 px-8 pb-8 md:grid-cols-2">
          {agentCount === 0 ? (
            <Card className="border-dashed">
              <CardHeader>
                <Badge variant="outline" className="mb-2 w-fit">
                  Primeiros passos
                </Badge>
                <CardTitle>Configure seu primeiro agente</CardTitle>
                <CardDescription>
                  Defina persona, voz, base de conhecimento e horários de atendimento.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline">
                  <Link href="/agents/new">
                    Criar agente
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : null}
          {phoneCount === 0 ? (
            <Card className="border-dashed">
              <CardHeader>
                <Badge variant="outline" className="mb-2 w-fit">
                  Próximo passo
                </Badge>
                <CardTitle>Conecte um número de telefone</CardTitle>
                <CardDescription>
                  Aponte um número Twilio (ou SIP trunk) pro seu agente atender.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline">
                  <Link href="/settings/phone-numbers">
                    Conectar número
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
