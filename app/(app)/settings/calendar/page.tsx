import { CalendarCheck2, ExternalLink } from "lucide-react";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { requireSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/with-org";

import { ConnectForm } from "./connect-form";
import { DefaultEventTypePicker } from "./event-type-picker";

export default async function CalendarSettingsPage() {
  const session = await requireSession();
  if (session.role !== "ADMIN") redirect("/settings");

  const db = getDb(session.orgId);
  const connection = await db.calcomConnection.findUnique({ where: { orgId: session.orgId } });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendário"
        description="Conecte sua conta Cal.com pra que o agente possa checar disponibilidade e agendar durante a ligação."
        className="border-0 px-0"
      />

      {connection ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-3">
              <div className="bg-success/10 text-success flex h-10 w-10 items-center justify-center rounded-lg">
                <CalendarCheck2 className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Cal.com conectado</CardTitle>
                <p className="text-muted-foreground text-xs">
                  {connection.managedUserEmail} · fuso {connection.timezone}
                </p>
              </div>
            </div>
            <Badge variant="success">Ativo</Badge>
          </CardHeader>
          <div className="space-y-4 px-6 pb-6">
            <DefaultEventTypePicker currentEventTypeId={connection.defaultEventTypeId} />
            <Button asChild variant="outline" size="sm">
              <a href="https://app.cal.com" target="_blank" rel="noreferrer">
                Abrir Cal.com
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </Card>
      ) : (
        <Empty
          icon={<CalendarCheck2 className="h-5 w-5" />}
          title="Conecte sua conta Cal.com"
          description="Criamos um managed user na sua conta Cal.com Platform automaticamente. Configure CALCOM_CLIENT_ID e CALCOM_CLIENT_SECRET no ambiente primeiro."
          action={<ConnectForm />}
        />
      )}
    </div>
  );
}
