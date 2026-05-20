import { Activity, Gauge, PhoneCall, Target, Timer, Wallet } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  loadAgentComparison,
  loadAnalyticsSummary,
  loadHeatmap,
  loadVolumeByDay,
} from "@/lib/analytics/queries";
import { requireSession } from "@/lib/auth/session";
import { currency, formatDuration, percent } from "@/lib/utils";

import { Heatmap } from "./heatmap";
import { LatencyHistogram } from "./latency-histogram";
import { RangePicker } from "./range-picker";
import { VolumeChart } from "./volume-chart";

const RANGE_TO_DAYS: Record<string, number> = {
  "1d": 1,
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const session = await requireSession();
  const { range } = await searchParams;
  const days = RANGE_TO_DAYS[range ?? "7d"] ?? 7;
  const rangeStart = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [summary, volume, heatmap, agentRows] = await Promise.all([
    loadAnalyticsSummary(session.orgId, rangeStart),
    loadVolumeByDay(session.orgId, rangeStart),
    loadHeatmap(session.orgId, rangeStart),
    loadAgentComparison(session.orgId, rangeStart),
  ]);

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Volume, conversão, latência e custo por chamada."
        actions={<RangePicker value={range ?? "7d"} />}
      />
      <div className="space-y-6 p-8">
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          <Metric
            icon={<PhoneCall className="text-muted-foreground h-4 w-4" />}
            label="Chamadas"
            value={summary.totalCalls.toLocaleString("pt-BR")}
          />
          <Metric
            icon={<Activity className="text-muted-foreground h-4 w-4" />}
            label="Taxa de atendimento"
            value={percent(summary.attendanceRate)}
          />
          <Metric
            icon={<Target className="text-muted-foreground h-4 w-4" />}
            label="Conversão"
            value={percent(summary.conversionRate)}
          />
          <Metric
            icon={<Timer className="text-muted-foreground h-4 w-4" />}
            label="AHT médio"
            value={summary.avgHandleTimeMs === 0 ? "—" : formatDuration(summary.avgHandleTimeMs)}
          />
          <Metric
            icon={<Wallet className="text-muted-foreground h-4 w-4" />}
            label="Custo total"
            value={currency(summary.totalCostCents, "USD")}
          />
          <Metric
            icon={<Gauge className="text-muted-foreground h-4 w-4" />}
            label="Latência p95"
            value={summary.latencyP95 === 0 ? "—" : `${summary.latencyP95}ms`}
            sub={summary.latencyP50 === 0 ? undefined : `p50 ${summary.latencyP50}ms`}
            highlight={summary.latencyP95 > 900}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-muted-foreground text-sm font-medium">
                Volume por dia
              </CardTitle>
            </CardHeader>
            <div className="px-6 pb-6">
              <VolumeChart data={volume} />
            </div>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-muted-foreground text-sm font-medium">
                Latência p95 — histograma
              </CardTitle>
            </CardHeader>
            <div className="px-6 pb-6">
              <LatencyHistogram orgId={session.orgId} rangeStart={rangeStart.toISOString()} />
            </div>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Mapa de horários
            </CardTitle>
          </CardHeader>
          <div className="overflow-x-auto px-6 pb-6">
            <Heatmap cells={heatmap} />
          </div>
        </Card>

        {agentRows.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Por agente</CardTitle>
            </CardHeader>
            <div className="divide-border divide-y">
              <div className="text-muted-foreground grid grid-cols-[1fr_120px_120px_120px] gap-3 px-6 py-2 text-xs tracking-wider uppercase">
                <span>Agente</span>
                <span className="text-right">Chamadas</span>
                <span className="text-right">Conversão</span>
                <span className="text-right">AHT</span>
              </div>
              {agentRows.map((a) => (
                <div
                  key={a.id}
                  className="grid grid-cols-[1fr_120px_120px_120px] gap-3 px-6 py-3 text-sm"
                >
                  <span className="font-medium">{a.name}</span>
                  <span className="text-right tabular-nums">{a.totalCalls}</span>
                  <span className="text-right tabular-nums">{percent(a.conversionRate)}</span>
                  <span className="text-right tabular-nums">
                    {a.avgHandleTimeMs === 0 ? "—" : formatDuration(a.avgHandleTimeMs)}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        ) : null}
      </div>
    </>
  );
}

function Metric({
  icon,
  label,
  value,
  sub,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <Card>
      <div className="space-y-1 p-4">
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-xs">{label}</p>
          {icon}
        </div>
        <p className={`text-xl font-semibold tabular-nums ${highlight ? "text-destructive" : ""}`}>
          {value}
        </p>
        {sub ? <p className="text-muted-foreground text-[10px]">{sub}</p> : null}
      </div>
    </Card>
  );
}
