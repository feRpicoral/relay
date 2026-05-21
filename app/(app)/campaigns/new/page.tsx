import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db/with-org";

import { NewCampaignForm } from "./form";

export default async function NewCampaignPage() {
  const session = await requireAdmin();

  const db = getDb(session.orgId);
  const [agents, phones] = await Promise.all([
    db.agent.findMany({ select: { id: true, name: true } }),
    db.phoneNumber.findMany({ where: { outbound: true }, select: { id: true, e164: true } }),
  ]);

  if (agents.length === 0 || phones.length === 0) {
    return (
      <>
        <PageHeader title="Nova campanha" />
        <div className="p-8">
          <Empty
            title="Precisa de pelo menos um agente e um número de saída"
            description="Configure um agente e conecte um número Twilio com outbound habilitado antes de criar a campanha."
          />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Nova campanha" description="Configure agente, número e cadência." />
      <div className="p-8">
        <Card className="p-6">
          <NewCampaignForm agents={agents} phones={phones} />
        </Card>
      </div>
    </>
  );
}
