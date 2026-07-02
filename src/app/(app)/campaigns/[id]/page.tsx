import { Bot, ChevronLeft, Inbox, Plus } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { CampaignKpiMetrics } from "@/components/campaigns/kpi-metrics";
import { CampaignLeadsTable, type LeadRow } from "@/components/campaigns/leads-table";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { Progress } from "@/components/ui/progress";
import { StateCard } from "@/components/ui/state-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireSession } from "@/lib/auth/session";
import { calledCount, campaignStatusLabel } from "@/lib/campaigns/labels";
import { getDb } from "@/lib/db/with-org";
import { campaignStatusVisual } from "@/lib/status-tone";
import { formatRelativeTime } from "@/lib/utils";

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
  const locale = await getLocale();
  const t = await getTranslations("campaigns.detail");
  const tList = await getTranslations("campaigns.list");
  const tStatus = await getTranslations("enums.campaignStatus");

  const campaign = await db.campaign.findUnique({
    where: { id },
    include: { agent: { select: { name: true } } },
  });
  if (!campaign) notFound();

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

  const counts = Object.fromEntries(statusCounts.map((s) => [s.status, s._count._all]));
  const called = calledCount(counts);
  const calling = counts["CALLING"] ?? 0;
  const reached = counts["REACHED"] ?? 0;
  const percent = totalLeads === 0 ? 0 : Math.round((called / totalLeads) * 100);

  const totalPages = Math.max(1, Math.ceil(totalLeads / LEADS_PAGE_SIZE));
  const now = new Date();
  const leadRows: LeadRow[] = leads.map((lead) => ({
    id: lead.id,
    phoneE164: lead.phoneE164,
    name: lead.name,
    status: lead.status,
    attempts: lead.attempts,
    lastCall: lead.lastAttemptAt ? formatRelativeTime(lead.lastAttemptAt, locale, now) : null,
  }));

  const visual = campaignStatusVisual(campaign.status);
  const from = totalLeads === 0 ? 0 : (page - 1) * LEADS_PAGE_SIZE + 1;
  const to = Math.min(page * LEADS_PAGE_SIZE, totalLeads);

  return (
    <>
      <div className="border-border flex items-start justify-between gap-4 border-b px-6 py-5 md:px-8">
        <div className="flex min-w-0 items-start gap-3">
          <Button asChild variant="outline" size="icon-sm" className="mt-0.5 shrink-0">
            <Link href="/campaigns" aria-label={t("back")}>
              <ChevronLeft className="size-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-foreground text-lg font-semibold">{campaign.name}</span>
              <StatusBadge
                label={campaignStatusLabel(campaign.status, tStatus)}
                tone={visual.tone}
                pulse={visual.pulse}
              />
            </div>
            <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-1.5 text-xs">
              <Bot className="size-3" />
              <span>{campaign.agent.name}</span>
              <span aria-hidden>·</span>
              <span>{tList("leadsCount", { count: totalLeads })}</span>
            </div>
          </div>
        </div>
        <CampaignActions campaignId={campaign.id} status={campaign.status} />
      </div>

      <div className="flex flex-col gap-4 p-6 md:p-8">
        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{t("progressLabel")}</span>
            <span className="text-foreground font-mono">
              {totalLeads === 0
                ? t("progressEmpty", { called, total: totalLeads })
                : t("progressValue", { called, total: totalLeads, percent })}
            </span>
          </div>
          <Progress value={percent} className="h-2.5" />
        </div>

        <CampaignKpiMetrics
          metrics={{
            total: totalLeads,
            calling,
            reached,
            pending: totalLeads - called - calling,
          }}
        />

        <p className="text-muted-foreground flex items-center gap-2 text-xs">
          <span className="border-border bg-secondary text-muted-foreground inline-flex items-center rounded-sm border px-1.5 py-0.5 font-semibold">
            {t("futureBadge")}
          </span>
          {t("futureNote")}
        </p>

        {totalLeads === 0 ? (
          <StateCard
            bordered
            icon={<Inbox />}
            title={t("zeroLeads.title")}
            description={t("zeroLeads.description")}
            actions={
              <Button asChild>
                <Link href="/campaigns/new">
                  <Plus className="size-4" />
                  {t("zeroLeads.cta")}
                </Link>
              </Button>
            }
          />
        ) : (
          <>
            <CampaignLeadsTable leads={leadRows} />
            <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
              <p className="text-muted-foreground text-sm">
                {t("leadsTable.paginationSummary", { from, to, total: totalLeads })}
              </p>
              {totalPages > 1 ? (
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  hrefForPage={(p) => `/campaigns/${id}?page=${p}`}
                  previousLabel={t("leadsTable.previous")}
                  nextLabel={t("leadsTable.next")}
                />
              ) : null}
            </div>
          </>
        )}
      </div>
    </>
  );
}
