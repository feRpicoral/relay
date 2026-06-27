import type { CampaignStatus } from "@prisma/client";
import { Bot } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/ui/status-badge";
import { campaignStatusLabel } from "@/lib/campaigns/labels";
import { campaignStatusVisual } from "@/lib/status-tone";

export interface CampaignCardData {
  id: string;
  name: string;
  status: CampaignStatus;
  agentName: string;
  totalLeads: number;
  calledLeads: number;
}

const PROGRESS_TONE: Partial<Record<CampaignStatus, string>> = {
  COMPLETED: "[&>div]:bg-success",
  CANCELED: "[&>div]:bg-destructive",
};

export async function CampaignCard({ campaign }: { campaign: CampaignCardData }) {
  const t = await getTranslations("campaigns.list");
  const tStatus = await getTranslations("enums.campaignStatus");

  const visual = campaignStatusVisual(campaign.status);
  const percent =
    campaign.totalLeads === 0 ? 0 : Math.round((campaign.calledLeads / campaign.totalLeads) * 100);
  const showProgress = campaign.status !== "DRAFT";

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-foreground font-semibold">{campaign.name}</div>
          <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="inline-flex items-center gap-1.5">
              <Bot className="size-3" />
              {campaign.agentName}
            </span>
            <span aria-hidden>·</span>
            <span>{t("leadsCount", { count: campaign.totalLeads })}</span>
          </div>
        </div>
        <StatusBadge
          label={campaignStatusLabel(campaign.status, tStatus)}
          tone={visual.tone}
          pulse={visual.pulse}
          className="shrink-0"
        />
      </div>

      {showProgress ? (
        <div>
          <div className="text-muted-foreground mb-1.5 flex items-center justify-between text-[11.5px]">
            <span>
              {t("progressCalled", { called: campaign.calledLeads, total: campaign.totalLeads })}
            </span>
            <span className="font-mono">{percent}%</span>
          </div>
          <Progress value={percent} className={PROGRESS_TONE[campaign.status]} />
        </div>
      ) : (
        <p className="text-muted-foreground text-xs">{t("notStarted")}</p>
      )}

      <Button asChild variant="outline" size="sm" className="mt-auto w-full">
        <Link href={`/campaigns/${campaign.id}`}>{t("viewCampaign")}</Link>
      </Button>
    </Card>
  );
}
