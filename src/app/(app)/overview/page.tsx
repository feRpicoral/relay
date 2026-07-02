import { ArrowRight, Bot, ChevronRight, PhoneCall, Plus, Radio, Target } from "lucide-react";
import Link from "next/link";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";

import { Sparkline } from "@/components/overview/sparkline";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dot } from "@/components/ui/dot";
import { KpiTile } from "@/components/ui/kpi-tile";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  loadActiveAgents,
  loadInProgressCalls,
  loadRecentCalls,
  loadTodayOutcomes,
  loadVolumeByDay,
} from "@/lib/analytics/queries";
import { requireSession } from "@/lib/auth/session";
import { outcomeLabel } from "@/lib/calls/labels";
import { getDb } from "@/lib/db/with-org";
import { callOutcomeVisual, callStatusVisual } from "@/lib/status-tone";
import { daysAgo, formatPhone, percent } from "@/lib/utils";

const VOLUME_WINDOW_DAYS = 14;
const RECENT_CALLS_LIMIT = 5;

export default async function OverviewPage() {
  const session = await requireSession();
  const db = getDb(session.orgId);
  const t = await getTranslations("overview");
  const tOutcome = await getTranslations("enums.outcome");
  const formatter = await getFormatter();
  const locale = await getLocale();

  const [
    callsToday,
    phoneCount,
    inboundCount,
    outboundCount,
    activeAgents,
    inProgress,
    recentCalls,
    outcomes,
    volume,
  ] = await Promise.all([
    db.call.count({ where: { startedAt: { gte: daysAgo(1) } } }),
    db.phoneNumber.count(),
    db.phoneNumber.count({ where: { inbound: true } }),
    db.phoneNumber.count({ where: { outbound: true } }),
    loadActiveAgents(session.orgId),
    loadInProgressCalls(session.orgId),
    loadRecentCalls(session.orgId, RECENT_CALLS_LIMIT),
    loadTodayOutcomes(session.orgId),
    loadVolumeByDay(session.orgId, daysAgo(VOLUME_WINDOW_DAYS)),
  ]);

  const userName = session.userName ?? session.email.split("@")[0] ?? session.email;
  const today = new Date();
  const conversionToday =
    outcomes.total === 0 ? 0 : (outcomes.scheduled + outcomes.qualified) / outcomes.total;

  const header = (
    <PageHeader
      title={t("greeting", { name: userName })}
      description={t("subtitle", {
        orgName: session.orgName,
        date: formatter.dateTime(today, { weekday: "long", day: "numeric", month: "long" }),
      })}
      actions={
        <>
          <Button asChild variant="outline">
            <Link href="/live">
              <Radio className="h-4 w-4" />
              {t("liveCalls")}
            </Link>
          </Button>
          <Button asChild>
            <Link href="/agents/new">
              <Plus className="h-4 w-4" />
              {t("newAgent")}
            </Link>
          </Button>
        </>
      }
    />
  );

  if (activeAgents.enabled === 0 && phoneCount === 0) {
    return (
      <>
        {header}
        <div className="flex flex-col gap-4 p-6 md:p-8">
          <div>
            <h2 className="text-lg font-semibold">{t("newOrg.title")}</h2>
            <p className="text-muted-foreground mt-1 text-sm">{t("newOrg.subtitle")}</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Card className="flex gap-3 p-4">
              <div className="bg-secondary text-primary flex size-10 shrink-0 items-center justify-center rounded-[11px]">
                <Bot className="size-5" />
              </div>
              <div>
                <div className="font-semibold">{t("newOrg.agent.title")}</div>
                <p className="text-muted-foreground mt-1 mb-3 text-sm leading-relaxed">
                  {t("newOrg.agent.description")}
                </p>
                <Button asChild size="sm">
                  <Link href="/agents/new">
                    <Plus className="size-3.5" />
                    {t("newOrg.agent.cta")}
                  </Link>
                </Button>
              </div>
            </Card>
            <Card className="flex gap-3 p-4">
              <div className="bg-secondary text-primary flex size-10 shrink-0 items-center justify-center rounded-[11px]">
                <PhoneCall className="size-5" />
              </div>
              <div>
                <div className="font-semibold">{t("newOrg.number.title")}</div>
                <p className="text-muted-foreground mt-1 mb-3 text-sm leading-relaxed">
                  {t("newOrg.number.description")}
                </p>
                <Button asChild size="sm" variant="outline">
                  <Link href="/settings/telephony">
                    <ArrowRight className="size-3.5" />
                    {t("newOrg.number.cta")}
                  </Link>
                </Button>
              </div>
            </Card>
          </div>
          <Card className="overflow-hidden p-0 opacity-60">
            <div className="text-muted-foreground border-b px-4 py-2.5 text-xs font-semibold tracking-wide uppercase">
              {t("newOrg.preview")}
            </div>
            <div className="grid grid-cols-2 gap-3 p-4 lg:grid-cols-4">
              <KpiTile
                icon={<PhoneCall className="size-3.5" />}
                label={t("kpi.callsToday")}
                value="—"
              />
              <KpiTile
                icon={<Bot className="size-3.5" />}
                label={t("kpi.activeAgents")}
                value="—"
                mono={false}
              />
              <KpiTile
                icon={<PhoneCall className="size-3.5" />}
                label={t("kpi.connectedNumbers")}
                value="—"
                mono={false}
              />
              <KpiTile
                icon={<Target className="size-3.5" />}
                label={t("kpi.conversionToday")}
                value="—"
                mono={false}
              />
            </div>
          </Card>
        </div>
      </>
    );
  }

  const volumeTotal = volume.reduce((sum, b) => sum + b.total, 0);
  const sparkValues = toDailySeries(volume, VOLUME_WINDOW_DAYS);

  return (
    <>
      {header}
      <div className="flex flex-col gap-4 p-6 md:p-8">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiTile
            icon={<PhoneCall className="size-3.5" />}
            label={t("kpi.callsToday")}
            value={callsToday}
            sub={callsToday === 0 ? t("kpi.noCallsToday") : undefined}
          />
          <KpiTile
            icon={<Bot className="size-3.5" />}
            label={t("kpi.activeAgents")}
            value={activeAgents.withCallsToday}
            mono={false}
            sub={t("kpi.ofEnabled", { count: activeAgents.enabled })}
          />
          <KpiTile
            icon={<PhoneCall className="size-3.5" />}
            label={t("kpi.connectedNumbers")}
            value={phoneCount}
            mono={false}
            sub={t("kpi.inboundOutbound", { inbound: inboundCount, outbound: outboundCount })}
          />
          <KpiTile
            icon={<Target className="size-3.5" />}
            label={t("kpi.conversionToday")}
            value={outcomes.total === 0 ? "—" : percent(conversionToday, 0)}
            mono={false}
            sub={outcomes.total === 0 ? t("kpi.awaitingFirstCall") : undefined}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr] lg:items-start">
          <div className="flex flex-col gap-4">
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between border-b px-5 py-3">
                <div className="flex items-center gap-2">
                  <StatusBadge tone="success" label={t("live.badge")} pulse />
                  <span className="text-sm font-semibold">{t("live.title")}</span>
                </div>
                <Button asChild variant="ghost" size="sm" className="text-primary">
                  <Link href="/live">
                    {t("live.viewAll")}
                    <ChevronRight className="size-3.5" />
                  </Link>
                </Button>
              </div>
              {inProgress.length === 0 ? (
                <p className="text-muted-foreground px-5 py-6 text-sm">{t("live.empty")}</p>
              ) : (
                <div className="divide-border/55 divide-y px-5">
                  {inProgress.map((call) => (
                    <div key={call.id} className="flex items-center gap-3 py-2.5">
                      <Dot tone={callStatusVisual(call.status).tone} pulse />
                      <span className="flex-1 font-mono text-sm font-semibold">
                        {formatPhone(call.callerE164)}
                      </span>
                      {call.agentName ? (
                        <span className="bg-secondary text-secondary-foreground inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs">
                          <Bot className="text-primary size-3" />
                          {call.agentName}
                        </span>
                      ) : null}
                      <span className="text-muted-foreground font-mono text-xs">
                        {elapsed(call.startedAt, today)}
                      </span>
                      <Button asChild size="sm">
                        <Link href={`/calls/${call.id}/live`}>{t("live.monitor")}</Link>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="overflow-hidden">
              <div className="flex items-center justify-between border-b px-5 py-3">
                <span className="text-sm font-semibold">{t("recent.title")}</span>
                <Button asChild variant="ghost" size="sm" className="text-primary">
                  <Link href="/calls">
                    {t("recent.viewAll")}
                    <ChevronRight className="size-3.5" />
                  </Link>
                </Button>
              </div>
              {recentCalls.length === 0 ? (
                <p className="text-muted-foreground px-5 py-6 text-sm">{t("recent.empty")}</p>
              ) : (
                <div className="divide-border/55 divide-y px-5">
                  {recentCalls.map((call) => {
                    const visual = call.outcome
                      ? callOutcomeVisual(call.outcome)
                      : callStatusVisual(call.status);
                    return (
                      <Link
                        key={call.id}
                        href={`/calls/${call.id}`}
                        className="hover:bg-accent/40 -mx-5 flex items-center gap-3 px-5 py-2.5 transition-colors"
                      >
                        <Dot tone={visual.tone} />
                        <span className="flex-1 font-mono text-sm font-semibold">
                          {formatPhone(call.callerE164)}
                        </span>
                        <StatusBadge
                          tone={visual.tone}
                          label={
                            call.outcome ? outcomeLabel(call.outcome, tOutcome) : tOutcome("OTHER")
                          }
                        />
                        <span className="text-muted-foreground w-12 text-right font-mono text-xs">
                          {formatter.dateTime(call.startedAt, { timeStyle: "short" })}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>

          <div className="flex flex-col gap-4">
            <Card className="p-4">
              <div className="text-sm font-semibold">{t("outcomes.title")}</div>
              {outcomes.total === 0 ? (
                <p className="text-muted-foreground py-3 text-sm">{t("outcomes.empty")}</p>
              ) : (
                <OutcomesBar
                  outcomes={outcomes}
                  conversion={conversionToday}
                  convertedLabel={t("outcomes.converted")}
                  scheduledLabel={tOutcome("SCHEDULED")}
                  qualifiedLabel={tOutcome("QUALIFIED")}
                  otherLabel={tOutcome("OTHER")}
                />
              )}
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">{t("volume.title")}</div>
                <span className="text-muted-foreground text-xs">
                  {t("volume.window", { days: VOLUME_WINDOW_DAYS })}
                </span>
              </div>
              <div className="mt-1.5 mb-2 font-mono text-xl font-semibold">
                {volumeTotal.toLocaleString(locale)}
              </div>
              {volumeTotal === 0 ? (
                <p className="text-muted-foreground text-sm">{t("volume.empty")}</p>
              ) : (
                <Sparkline values={sparkValues} />
              )}
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

function OutcomesBar({
  outcomes,
  conversion,
  convertedLabel,
  scheduledLabel,
  qualifiedLabel,
  otherLabel,
}: {
  outcomes: { scheduled: number; qualified: number; total: number };
  conversion: number;
  convertedLabel: string;
  scheduledLabel: string;
  qualifiedLabel: string;
  otherLabel: string;
}) {
  const total = outcomes.total;
  const scheduledPct = Math.round((outcomes.scheduled / total) * 100);
  const qualifiedPct = Math.round((outcomes.qualified / total) * 100);
  const otherPct = Math.max(0, 100 - scheduledPct - qualifiedPct);

  return (
    <>
      <div className="text-2xl font-semibold tracking-tight">
        {percent(conversion, 0)}
        <span className="text-muted-foreground text-sm font-normal"> {convertedLabel}</span>
      </div>
      <div className="my-3 flex h-2 overflow-hidden rounded-full">
        <span className="bg-success" style={{ width: `${scheduledPct}%` }} />
        <span className="bg-success/60" style={{ width: `${qualifiedPct}%` }} />
        <span className="bg-secondary" style={{ width: `${otherPct}%` }} />
      </div>
      <div className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 text-xs">
        <LegendItem className="bg-success" label={`${scheduledLabel} ${scheduledPct}%`} />
        <LegendItem className="bg-success/60" label={`${qualifiedLabel} ${qualifiedPct}%`} />
        <LegendItem className="bg-secondary" label={`${otherLabel} ${otherPct}%`} />
      </div>
    </>
  );
}

function LegendItem({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`size-2 rounded-sm ${className}`} />
      {label}
    </span>
  );
}

function toDailySeries(volume: { day: string; total: number }[], days: number): number[] {
  const counts = new Map(volume.map((b) => [b.day, b.total]));
  const series: number[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const day = daysAgo(i).toISOString().slice(0, 10);
    series.push(counts.get(day) ?? 0);
  }
  return series;
}

function elapsed(startedAt: Date, now: Date): string {
  const totalSeconds = Math.max(0, Math.floor((now.getTime() - startedAt.getTime()) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}
