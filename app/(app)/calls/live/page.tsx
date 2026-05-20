import { PhoneCall } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { Empty } from "@/components/ui/empty";
import { requireSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/with-org";

import { LiveCallsList } from "./live-list";

export default async function LiveCallsPage() {
  const session = await requireSession();
  const db = getDb(session.orgId);
  const initial = await db.call.findMany({
    where: { status: { in: ["RINGING", "IN_PROGRESS"] } },
    orderBy: { startedAt: "desc" },
    take: 20,
    include: { agent: { select: { name: true } } },
  });

  return (
    <>
      <PageHeader
        title="Chamadas ao vivo"
        description="Acompanhe as ligações que estão acontecendo agora, clique numa pra ver a transcrição em tempo real."
      />
      <div className="p-8">
        {initial.length === 0 ? (
          <Empty
            icon={<PhoneCall className="h-5 w-5" />}
            title="Nada acontecendo agora"
            description="Quando uma chamada começar, ela aparece aqui em tempo real."
          />
        ) : null}
        <LiveCallsList
          orgId={session.orgId}
          initial={initial.map((c) => ({
            id: c.id,
            org_id: c.orgId,
            agent_name: c.agent?.name ?? null,
            caller_e164: c.callerE164,
            callee_e164: c.calleeE164,
            direction: c.direction,
            status: c.status as "RINGING" | "IN_PROGRESS",
            started_at: c.startedAt.toISOString(),
          }))}
        />
      </div>
      {/* Quick link to history at the bottom. */}
      <div className="px-8 pb-8">
        <Link
          href="/calls"
          className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
        >
          Ver histórico de chamadas
        </Link>
      </div>
    </>
  );
}
