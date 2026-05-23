import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db/with-org";

import { NewCampaignForm } from "./form";

export default async function NewCampaignPage() {
  const session = await requireAdmin();
  const t = await getTranslations("campaigns.new");
  const tErrors = await getTranslations("campaigns.new.errors");

  const db = getDb(session.orgId);
  const [agents, phones] = await Promise.all([
    db.agent.findMany({ select: { id: true, name: true } }),
    db.phoneNumber.findMany({ where: { outbound: true }, select: { id: true, e164: true } }),
  ]);

  if (agents.length === 0 || phones.length === 0) {
    return (
      <>
        <PageHeader title={t("title")} />
        <div className="p-8">
          <Empty
            title={agents.length === 0 ? tErrors("noAgents") : tErrors("noNumbers")}
            description={t("description")}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <div className="p-8">
        <Card className="p-6">
          <NewCampaignForm agents={agents} phones={phones} />
        </Card>
      </div>
    </>
  );
}
