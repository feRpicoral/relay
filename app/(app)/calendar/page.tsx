import { CalendarCheck2, CalendarPlus } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { requireSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/with-org";

export default async function CalendarPage() {
  const session = await requireSession();
  const db = getDb(session.orgId);

  const [connection, recentBookings] = await Promise.all([
    db.calcomConnection.findUnique({ where: { orgId: session.orgId } }),
    db.toolCall.findMany({
      where: { name: "book_appointment" },
      orderBy: { startedAt: "desc" },
      take: 20,
      include: {
        call: { select: { id: true, callerE164: true } },
      },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Calendário"
        description="Agendamentos criados pelos seus agentes durante chamadas."
        actions={
          <Button asChild variant="outline">
            <Link href="/settings/calendar">
              <CalendarCheck2 className="h-4 w-4" />
              Configurar Cal.com
            </Link>
          </Button>
        }
      />
      <div className="p-8">
        {!connection ? (
          <Empty
            icon={<CalendarPlus className="h-5 w-5" />}
            title="Cal.com não conectado"
            description="Conecte sua conta pra que o agente possa marcar consultas durante a ligação."
            action={
              <Button asChild>
                <Link href="/settings/calendar">Conectar agora</Link>
              </Button>
            }
          />
        ) : recentBookings.length === 0 ? (
          <Empty
            icon={<CalendarCheck2 className="h-5 w-5" />}
            title="Nenhum agendamento ainda"
            description="Quando o agente marcar uma consulta, ela aparece aqui."
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Agendamentos recentes</CardTitle>
            </CardHeader>
            <div className="divide-border divide-y">
              {recentBookings.map((booking) => {
                const input = booking.inputJson as Record<string, unknown>;
                const output = booking.outputJson as Record<string, unknown> | null;
                return (
                  <Link
                    key={booking.id}
                    href={`/calls/${booking.callId}`}
                    className="hover:bg-accent/40 flex items-center justify-between px-5 py-3 transition-colors"
                  >
                    <div>
                      <p className="font-medium">{String(input.patientName ?? "Paciente")}</p>
                      <p className="text-muted-foreground text-xs">
                        {String(input.slotIso ?? "")}, {String(input.patientPhone ?? "")}
                      </p>
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {output?.status === "ACCEPTED" || output?.status === "CONFIRMED"
                        ? "Confirmada"
                        : ((output?.status as string) ?? "-")}
                    </p>
                  </Link>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
