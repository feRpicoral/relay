import { getTranslations } from "next-intl/server";

import { Empty } from "@/components/ui/empty";
import type { OrgId } from "@/lib/db/types";
import { getDb } from "@/lib/db/with-org";

import { LatencyHistogramChart } from "./latency-histogram-chart";

export async function LatencyHistogram({
  orgId,
  rangeStart,
}: {
  orgId: OrgId;
  rangeStart: string;
}) {
  const t = await getTranslations("analytics");
  const db = getDb(orgId);
  const metrics = await db.callMetric.findMany({
    where: { leg: "END_TO_END", occurredAt: { gte: new Date(rangeStart) } },
    select: { valueMs: true },
  });

  if (metrics.length === 0) {
    return <Empty title={t("widgets.notEnoughSamples")} />;
  }

  const edges = [0, 150, 300, 500, 700, 900, 1100];
  const counts = edges.map((lo, i) => {
    const hi = edges[i + 1] ?? Infinity;
    return {
      label: hi === Infinity ? `>${lo}` : `${lo}–${hi}`,
      lo,
      count: metrics.filter((m) => m.valueMs >= lo && m.valueMs < hi).length,
    };
  });

  return <LatencyHistogramChart data={counts} />;
}
