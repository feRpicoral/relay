import {
  Activity,
  Bot,
  CreditCard,
  Gauge,
  PhoneCall,
  Target,
  Timer,
  TriangleAlert,
} from "lucide-react";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/page-header";
import { Banner } from "@/components/ui/banner";
import { Card } from "@/components/ui/card";
import { KpiTile, Trend } from "@/components/ui/kpi-tile";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  loadAgentComparison,
  loadAnalyticsSummary,
  loadHeatmap,
  loadOrgTimezone,
  loadVolumeByDay,
} from "@/lib/analytics/queries";
import { requireSession } from "@/lib/auth/session";
import { LEG_BUDGET_MS } from "@/lib/constants";
import { compactNumber, formatCostUsdBrl, formatDuration, percent } from "@/lib/utils";

import { Heatmap } from "./heatmap";
import { LatencyHistogram } from "./latency-histogram";
import { RangePicker } from "./range-picker";
import { VolumeChart } from "./volume-chart";

const RANGE_TO_DAYS: Record<string, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

const EMPTY_VALUE = "—";
const BUDGET_MS = LEG_BUDGET_MS.END_TO_END;

function rangeStartFromDays(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const session = await requireSession();
  const { range } = await searchParams;
  const activeRange = range && range in RANGE_TO_DAYS ? range : "7d";
  const days = RANGE_TO_DAYS[activeRange] ?? 7;
  const rangeStart = rangeStartFromDays(days);

  const t = await getTranslations("analytics");
  const locale = await getLocale();
  const format = await getFormatter();

  const timezone = await loadOrgTimezone(session.orgId);
  const [summary, volume, heatmap, agentRows] = await Promise.all([
    loadAnalyticsSummary(session.orgId, rangeStart),
    loadVolumeByDay(session.orgId, rangeStart),
    loadHeatmap(session.orgId, rangeStart, timezone),
    loadAgentComparison(session.orgId, rangeStart),
  ]);

  const p95OverBudget = summary.latencyP95 > BUDGET_MS;
  const handleTimeSeconds = Math.round(summary.deltaAvgHandleTimeMs / 1000);

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={<RangePicker value={activeRange} />}
      />
      <div className="flex flex-col gap-4 p-6 md:p-8">
        {p95OverBudget ? (
          <Banner tone="destructive" icon={<TriangleAlert />}>
            <span className="font-semibold">{t("alerts.p95OverBudget.title")}</span>{" "}
            {t("alerts.p95OverBudget.body", { p95: summary.latencyP95, budget: BUDGET_MS })}
          </Banner>
        ) : null}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <KpiTile
            icon={<PhoneCall className="size-3.5" />}
            label={t("stats.totalCalls")}
            value={compactNumber(summary.totalCalls, locale)}
            sub={<Trend delta={summary.deltaTotalCallsPct} suffix="%" />}
          />
          <KpiTile
            icon={<Activity className="size-3.5" />}
            label={t("stats.attendanceRate")}
            value={percent(summary.attendanceRate, 0)}
            sub={<Trend delta={summary.deltaAttendancePts} suffix={t("units.points")} />}
          />
          <KpiTile
            icon={<Target className="size-3.5" />}
            label={t("stats.conversionRate")}
            value={percent(summary.conversionRate, 0)}
            sub={<Trend delta={summary.deltaConversionPts} suffix={t("units.points")} />}
          />
          <KpiTile
            icon={<Timer className="size-3.5" />}
            label={t("stats.avgHandleTime")}
            value={
              summary.avgHandleTimeMs === 0 ? EMPTY_VALUE : formatDuration(summary.avgHandleTimeMs)
            }
            sub={<Trend delta={handleTimeSeconds} suffix={t("units.seconds")} invert />}
          />
          <KpiTile
            icon={<CreditCard className="size-3.5" />}
            label={t("stats.totalCost")}
            value={formatCostUsdBrl(summary.totalCostCents, locale)}
          />
          <KpiTile
            icon={<Gauge className="size-3.5" />}
            label={t("stats.p95Latency")}
            value={
              summary.latencyP95 === 0 ? EMPTY_VALUE : t("units.ms", { value: summary.latencyP95 })
            }
            className={p95OverBudget ? "border-destructive/40" : undefined}
            sub={
              <span className={p95OverBudget ? "text-destructive font-semibold" : undefined}>
                {p95OverBudget
                  ? t("stats.p95OverBudget", { budget: BUDGET_MS })
                  : t("stats.p95WithinBudget", { budget: BUDGET_MS })}
              </span>
            }
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr] lg:items-start">
          <Card className="overflow-hidden">
            <div className="flex items-start justify-between gap-3 px-5 pt-4">
              <div>
                <div className="text-sm font-semibold">{t("charts.volume")}</div>
                <span className="text-muted-foreground text-xs">
                  {t("charts.volumeSubtitle", { days })}
                </span>
              </div>
              <ChartLegend
                items={[
                  { color: "var(--color-primary)", label: t("charts.volumeTotal") },
                  { color: "var(--color-success)", label: t("charts.volumeScheduled") },
                ]}
              />
            </div>
            <div className="px-3 pt-2 pb-4">
              <VolumeChart data={volume} />
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="flex items-start justify-between gap-3 px-5 pt-4">
              <div>
                <div className="text-sm font-semibold">{t("charts.latencyHistogram")}</div>
                <span className="text-muted-foreground text-xs">{t("charts.latencySubtitle")}</span>
              </div>
              <ChartLegend
                items={[
                  { color: "var(--color-primary)", label: t("charts.latencyOk") },
                  { color: "var(--color-warning)", label: t("charts.latencyWarn") },
                  { color: "var(--color-destructive)", label: t("charts.latencyBad") },
                ]}
              />
            </div>
            <div className="px-3 pt-2 pb-4">
              <LatencyHistogram orgId={session.orgId} rangeStart={rangeStart.toISOString()} />
            </div>
          </Card>
        </div>

        <Card className="overflow-hidden">
          <div className="px-5 pt-4">
            <div className="text-sm font-semibold">{t("charts.heatmap")}</div>
          </div>
          <div className="overflow-x-auto p-4">
            <Heatmap cells={heatmap} timezone={timezone} />
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="flex items-center gap-2 px-5 pt-4 pb-3">
            <span className="text-sm font-semibold">{t("charts.agents")}</span>
            <span className="text-muted-foreground text-xs">{t("charts.agentsSubtitle")}</span>
          </div>
          {agentRows.length === 0 ? (
            <p className="text-muted-foreground px-5 pb-6 text-sm">
              {t("widgets.noAgentActivity")}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("agentTable.agent")}</TableHead>
                  <TableHead className="text-right">{t("agentTable.calls")}</TableHead>
                  <TableHead className="text-right">{t("agentTable.attendance")}</TableHead>
                  <TableHead className="text-right">{t("agentTable.conversion")}</TableHead>
                  <TableHead className="text-right">{t("agentTable.avgHandle")}</TableHead>
                  <TableHead className="text-right">{t("agentTable.cost")}</TableHead>
                  <TableHead className="text-right">{t("agentTable.p95")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agentRows.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <span className="inline-flex items-center gap-2 font-medium">
                        <Bot className="text-primary size-3.5" />
                        {a.name}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {format.number(a.totalCalls)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-right font-mono">
                      {percent(a.attendanceRate, 0)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-right font-mono">
                      {percent(a.conversionRate, 0)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-right font-mono">
                      {a.avgHandleTimeMs === 0 ? EMPTY_VALUE : formatDuration(a.avgHandleTimeMs)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-right font-mono">
                      {format.number(a.totalCostCents / 100, {
                        style: "currency",
                        currency: "USD",
                      })}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {a.p95LatencyMs === 0 ? (
                        <span className="text-muted-foreground">{EMPTY_VALUE}</span>
                      ) : (
                        <span
                          className={a.p95LatencyMs > BUDGET_MS ? "text-destructive" : undefined}
                        >
                          {t("units.ms", { value: a.p95LatencyMs })}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </>
  );
}

function ChartLegend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-sm" style={{ background: item.color }} />
          {item.label}
        </span>
      ))}
    </div>
  );
}
