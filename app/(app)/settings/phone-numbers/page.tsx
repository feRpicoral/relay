import { redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { requireSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/with-org";

import { PhoneNumberForm } from "./form";
import { PhoneNumberTable } from "./table";

export default async function PhoneNumbersPage() {
  const session = await requireSession();
  if (session.role !== "ADMIN") redirect("/settings");

  const db = getDb(session.orgId);
  const [numbers, agents] = await Promise.all([
    db.phoneNumber.findMany({
      orderBy: { createdAt: "desc" },
      include: { agent: { select: { name: true } } },
    }),
    db.agent.findMany({ select: { id: true, name: true } }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Números de telefone"
        description="Conecte um número Twilio (ou outro provider via SIP) ao Relay e aponte pra um agente."
        className="border-0 px-0"
      />
      <Card className="p-6">
        <PhoneNumberForm agents={agents} />
      </Card>
      {numbers.length === 0 ? (
        <Empty
          title="Nenhum número ainda"
          description="Compre um número Twilio e cole o E.164 + agente acima."
        />
      ) : (
        <PhoneNumberTable
          numbers={numbers.map((n) => ({
            id: n.id,
            e164: n.e164,
            label: n.label,
            agentId: n.agentId,
            agentName: n.agent?.name ?? null,
          }))}
          agents={agents}
        />
      )}
    </div>
  );
}
