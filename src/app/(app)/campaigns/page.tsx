import { Megaphone, Plus } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { requireSession } from "@/lib/auth/session";
import { CAMPAIGN_STATUS_VARIANT, campaignStatusLabel } from "@/lib/campaigns/labels";
import { getDb } from "@/lib/db/with-org";

export default async function CampaignsPage() {
  const session = await requireSession();
  const db = getDb(session.orgId);
  const t = await getTranslations("campaigns.list");
  const tStatus = await getTranslations("enums.campaignStatus");

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
        title={t("title")}
        description={t("description")}
        actions={
          <Button asChild>
            <Link href="/campaigns/new">
              <Plus className="h-4 w-4" />
              {t("newCampaign")}
            </Link>
          </Button>
        }
      />
      <div className="p-8">
        {campaigns.length === 0 ? (
          <Empty
            icon={<Megaphone className="h-5 w-5" />}
            title={t("empty.title")}
            description={t("empty.description")}
            action={
              <Button asChild>
                <Link href="/campaigns/new">{t("empty.cta")}</Link>
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
                        {t("agentLabel")} {c.agent.name},{" "}
                        {t("leadsCount", { count: c._count.leads })}
                      </p>
                    </div>
                    <Badge variant={CAMPAIGN_STATUS_VARIANT[c.status] ?? "secondary"}>
                      {campaignStatusLabel(c.status, tStatus)}
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
