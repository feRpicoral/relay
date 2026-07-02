import type { CampaignLeadStatus } from "@prisma/client";
import { Megaphone, Plus } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { CampaignCard } from "@/components/campaigns/campaign-card";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { StateCard } from "@/components/ui/state-card";
import { requireSession } from "@/lib/auth/session";
import { calledCount } from "@/lib/campaigns/labels";
import { getDb } from "@/lib/db/with-org";

export default async function CampaignsPage() {
  const session = await requireSession();
  const db = getDb(session.orgId);
  const t = await getTranslations("campaigns.list");

  const [campaigns, leadCounts] = await Promise.all([
    db.campaign.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        agent: { select: { name: true } },
        _count: { select: { leads: true } },
      },
    }),
    db.campaignLead.groupBy({
      by: ["campaignId", "status"],
      _count: { _all: true },
    }),
  ]);

  const calledByCampaign = new Map<string, Partial<Record<CampaignLeadStatus, number>>>();
  for (const row of leadCounts) {
    const entry = calledByCampaign.get(row.campaignId) ?? {};
    entry[row.status] = row._count._all;
    calledByCampaign.set(row.campaignId, entry);
  }

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <Button asChild>
            <Link href="/campaigns/new">
              <Plus className="size-4" />
              {t("newCampaign")}
            </Link>
          </Button>
        }
      />
      {campaigns.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-6 md:p-8">
          <StateCard
            icon={<Megaphone />}
            title={t("empty.title")}
            description={t("empty.description")}
            actions={
              <Button asChild>
                <Link href="/campaigns/new">
                  <Plus className="size-4" />
                  {t("empty.cta")}
                </Link>
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid gap-3.5 p-6 sm:grid-cols-2 md:p-8 lg:grid-cols-3">
          {campaigns.map((c) => (
            <CampaignCard
              key={c.id}
              campaign={{
                id: c.id,
                name: c.name,
                status: c.status,
                agentName: c.agent.name,
                totalLeads: c._count.leads,
                calledLeads: calledCount(calledByCampaign.get(c.id) ?? {}),
              }}
            />
          ))}
        </div>
      )}
    </>
  );
}
