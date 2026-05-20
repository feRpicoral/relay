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
  const db = getDb(orgId);
  const metrics = await db.callMetric.findMany({
    where: { leg: "END_TO_END", occurredAt: { gte: new Date(rangeStart) } },
    select: { valueMs: true },
  });

  if (metrics.length === 0) {
    return (
      <Empty
        title="Sem dados de latência"
        description="Métricas aparecem após a primeira chamada."
      />
    );
  }

  const buckets = [0, 200, 400, 600, 800, 1000, 1200, 1500, 2000, 3000];
  const counts = buckets.map((_, i) => {
    const lo = buckets[i] ?? 0;
    const hi = buckets[i + 1] ?? Infinity;
    return {
      label: `${lo}-${hi === Infinity ? "∞" : hi}ms`,
      lo,
      count: metrics.filter((m) => m.valueMs >= lo && m.valueMs < hi).length,
    };
  });

  return <LatencyHistogramChart data={counts} />;
}
