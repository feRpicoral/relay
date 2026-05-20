import { PhoneCall } from "lucide-react";
import Link from "next/link";

import { CallStatusBadge } from "@/components/call/call-status-badge";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { requireSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/with-org";
import { formatDuration, formatPhone } from "@/lib/utils";

export default async function CallsPage() {
  const session = await requireSession();
  const db = getDb(session.orgId);

  const calls = await db.call.findMany({
    orderBy: { startedAt: "desc" },
    take: 100,
    include: { agent: { select: { name: true } } },
  });

  return (
    <>
      <PageHeader
        title="Chamadas"
        description="Histórico de todas as chamadas atendidas pelos seus agentes."
        actions={
          <Button asChild variant="outline">
            <Link href="/calls/live">
              <PhoneCall className="h-4 w-4" />
              Chamadas ao vivo
            </Link>
          </Button>
        }
      />
      <div className="p-8">
        {calls.length === 0 ? (
          <Empty
            icon={<PhoneCall className="h-5 w-5" />}
            title="Nenhuma chamada ainda"
            description="Quando seu agente atender uma ligação, ela aparece aqui em segundos."
          />
        ) : (
          <Card className="overflow-hidden">
            <div className="divide-border divide-y">
              {calls.map((call) => (
                <Link
                  key={call.id}
                  href={`/calls/${call.id}`}
                  className="hover:bg-accent/40 flex items-center justify-between px-5 py-3 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <CallStatusBadge status={call.status} />
                    <div>
                      <p className="font-medium">
                        {call.direction === "INBOUND"
                          ? formatPhone(call.callerE164)
                          : formatPhone(call.calleeE164)}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {call.agent?.name ?? "-"} ,{" "}
                        {call.direction === "INBOUND" ? "Recebida" : "Realizada"} ,{" "}
                        {new Intl.DateTimeFormat("pt-BR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        }).format(call.startedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {call.durationMs != null ? (
                      <p className="font-mono text-sm">{formatDuration(call.durationMs)}</p>
                    ) : null}
                    {call.outcome ? (
                      <p className="text-muted-foreground text-xs">{call.outcome}</p>
                    ) : null}
                  </div>
                </Link>
              ))}
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
