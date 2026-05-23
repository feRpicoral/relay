import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { requireSession } from "@/lib/auth/session";
import {
  CAMPAIGN_STATUS_VARIANT,
  campaignStatusLabel,
  LEAD_STATUS_VARIANT,
  leadStatusLabel,
  TERMINAL_LEAD_STATUSES,
} from "@/lib/campaigns/labels";
import { getDb } from "@/lib/db/with-org";
import { formatPhone } from "@/lib/utils";

import { CampaignActions } from "./actions-bar";

const LEADS_PAGE_SIZE = 50;

export default async function CampaignPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { id } = await params;
  const { page: pageStr } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageStr ?? "1", 10) || 1);

  const session = await requireSession();
  const db = getDb(session.orgId);
  const t = await getTranslations("campaigns.detail");
  const tCallsList = await getTranslations("calls.list");
  const tCampaignsList = await getTranslations("campaigns.list");
  const tStatus = await getTranslations("enums.campaignStatus");
  const tLead = await getTranslations("enums.campaignLeadStatus");

  const campaign = await db.campaign.findUnique({
    where: { id },
    include: { agent: { select: { name: true } } },
  });
  if (!campaign) notFound();

  // Counts come from groupBy over ALL leads (not the paginated slice) so the
  // progress bar reflects the full campaign instead of one page.
  const [statusCounts, leads, totalLeads] = await Promise.all([
    db.campaignLead.groupBy({
      by: ["status"],
      where: { campaignId: id },
      _count: { _all: true },
    }),
    db.campaignLead.findMany({
      where: { campaignId: id },
      orderBy: { createdAt: "asc" },
      skip: (page - 1) * LEADS_PAGE_SIZE,
      take: LEADS_PAGE_SIZE,
    }),
    db.campaignLead.count({ where: { campaignId: id } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalLeads / LEADS_PAGE_SIZE));
  const counts = Object.fromEntries(statusCounts.map((s) => [s.status, s._count._all]));
  const reached = counts["REACHED"] ?? 0;
  const callsInFlight = counts["CALLING"] ?? 0;
  const completed = TERMINAL_LEAD_STATUSES.reduce((acc, s) => acc + (counts[s] ?? 0), 0);
  const progress = totalLeads === 0 ? 0 : Math.round((completed / totalLeads) * 100);

  return (
    <>
      <PageHeader
        title={campaign.name}
        description={`${tCampaignsList("agentLabel")} ${campaign.agent.name}, ${tCampaignsList("fromLabel")} ${campaign.fromPhoneNumberE164}`}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={CAMPAIGN_STATUS_VARIANT[campaign.status] ?? "secondary"}>
              {campaignStatusLabel(campaign.status, tStatus)}
            </Badge>
            <CampaignActions campaignId={campaign.id} status={campaign.status} />
          </div>
        }
      />
      <div className="space-y-6 p-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground text-sm font-medium">
              {t("stats.total")}
            </CardTitle>
          </CardHeader>
          <div className="space-y-3 px-6 pb-6">
            <Progress value={progress} />
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Stat label={t("stats.total")} value={totalLeads} />
              <Stat label={tLead("CALLING")} value={callsInFlight} />
              <Stat label={t("stats.reached")} value={reached} />
              <Stat label={t("stats.pending")} value={totalLeads - completed - callsInFlight} />
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("leadsTab")}</CardTitle>
          </CardHeader>
          <div className="divide-border divide-y">
            {leads.map((lead) => (
              <div key={lead.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="font-medium">{lead.name ?? formatPhone(lead.phoneE164)}</p>
                  <p className="text-muted-foreground text-xs">{formatPhone(lead.phoneE164)}</p>
                </div>
                <Badge variant={LEAD_STATUS_VARIANT[lead.status] ?? "secondary"}>
                  {leadStatusLabel(lead.status, tLead)}
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        {totalPages > 1 ? (
          <div className="flex items-center justify-between text-sm">
            <p className="text-muted-foreground">
              {tCallsList("paginationSummary", { page, totalPages, total: totalLeads })}
            </p>
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm" disabled={page <= 1}>
                <Link href={`/campaigns/${id}?page=${page - 1}`} aria-disabled={page <= 1}>
                  <ChevronLeft className="h-4 w-4" />
                  {tCallsList("previous")}
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" disabled={page >= totalPages}>
                <Link href={`/campaigns/${id}?page=${page + 1}`} aria-disabled={page >= totalPages}>
                  {tCallsList("next")}
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
