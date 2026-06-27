import { getTranslations } from "next-intl/server";

import { Dot } from "@/components/ui/dot";
import { KpiTile } from "@/components/ui/kpi-tile";

export interface CampaignMetrics {
  total: number;
  calling: number;
  reached: number;
  pending: number;
}

export async function CampaignKpiMetrics({ metrics }: { metrics: CampaignMetrics }) {
  const t = await getTranslations("campaigns.detail.kpis");

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <KpiTile label={t("total")} value={metrics.total} />
      <KpiTile
        label={t("calling")}
        value={
          <span className="flex items-center gap-2">
            {metrics.calling}
            {metrics.calling > 0 ? <Dot tone="primary" pulse /> : null}
          </span>
        }
      />
      <KpiTile
        label={t("reached")}
        value={<span className="text-success">{metrics.reached}</span>}
      />
      <KpiTile label={t("pending")} value={metrics.pending} />
    </div>
  );
}
