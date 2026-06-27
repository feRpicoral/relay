import { ArrowUpRight, Bot, Phone, PhoneCall } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/with-org";
import { daysAgo } from "@/lib/utils";

export default async function DashboardPage() {
  const session = await requireSession();
  const db = getDb(session.orgId);
  const t = await getTranslations("dashboard");

  const [callsToday, agentCount, phoneCount] = await Promise.all([
    db.call.count({
      where: { startedAt: { gte: daysAgo(1) } },
    }),
    db.agent.count(),
    db.phoneNumber.count(),
  ]);

  const userName = session.userName ?? session.email.split("@")[0] ?? session.email;

  return (
    <>
      <PageHeader
        title={t("greeting", { name: userName })}
        description={t("overview", { orgName: session.orgName })}
        actions={
          <Button asChild>
            <Link href="/agents/new">
              <Bot className="h-4 w-4" />
              {t("newAgent")}
            </Link>
          </Button>
        }
      />
      <div className="grid gap-4 p-8 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              {t("stats.callsToday")}
            </CardTitle>
            <PhoneCall className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{callsToday}</div>
            <p className="text-muted-foreground mt-1 text-xs">{t("stats.callsTodayHint")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              {t("stats.activeAgents")}
            </CardTitle>
            <Bot className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{agentCount}</div>
            <p className="text-muted-foreground mt-1 text-xs">{t("stats.activeAgentsHint")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              {t("stats.connectedLines")}
            </CardTitle>
            <Phone className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{phoneCount}</div>
            <p className="text-muted-foreground mt-1 text-xs">{t("stats.connectedLinesHint")}</p>
          </CardContent>
        </Card>
      </div>

      {agentCount === 0 || phoneCount === 0 ? (
        <div className="grid gap-4 px-8 pb-8 md:grid-cols-2">
          {agentCount === 0 ? (
            <Card className="border-dashed">
              <CardHeader>
                <Badge variant="outline" className="mb-2 w-fit">
                  {t("onboarding.firstStep")}
                </Badge>
                <CardTitle>{t("onboarding.setupAgent.title")}</CardTitle>
                <CardDescription>{t("onboarding.setupAgent.description")}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline">
                  <Link href="/agents/new">
                    {t("onboarding.setupAgent.cta")}
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : null}
          {phoneCount === 0 ? (
            <Card className="border-dashed">
              <CardHeader>
                <Badge variant="outline" className="mb-2 w-fit">
                  {t("onboarding.nextStep")}
                </Badge>
                <CardTitle>{t("onboarding.connectNumber.title")}</CardTitle>
                <CardDescription>{t("onboarding.connectNumber.description")}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline">
                  <Link href="/settings/telephony">
                    {t("onboarding.connectNumber.cta")}
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
