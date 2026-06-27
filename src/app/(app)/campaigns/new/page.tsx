import { Bot, ChevronLeft, Lock, Phone, Plus } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { StateCard } from "@/components/ui/state-card";
import { requireSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/with-org";

import { NewCampaignForm } from "./form";

export default async function NewCampaignPage() {
  const session = await requireSession();
  const t = await getTranslations("campaigns.new");

  const header = (
    <div className="border-border flex items-center gap-3 border-b px-6 py-4 md:px-8">
      <Button asChild variant="outline" size="icon-sm" className="shrink-0">
        <Link href="/campaigns" aria-label={t("backToCampaigns")}>
          <ChevronLeft className="size-4" />
        </Link>
      </Button>
      <div className="min-w-0">
        <h1 className="text-foreground text-lg font-semibold">{t("title")}</h1>
        <p className="text-muted-foreground mt-0.5 text-xs">{t("subtitle")}</p>
      </div>
    </div>
  );

  if (session.role !== "ADMIN") {
    return (
      <>
        {header}
        <div className="flex flex-1 items-center justify-center p-8">
          <StateCard
            icon={<Lock />}
            title={t("adminOnly.title")}
            description={t("adminOnly.description")}
            actions={
              <Button asChild variant="outline" size="lg">
                <Link href="/campaigns">
                  <ChevronLeft className="size-4" />
                  {t("adminOnly.back")}
                </Link>
              </Button>
            }
          />
        </div>
      </>
    );
  }

  const db = getDb(session.orgId);
  const [agents, phones] = await Promise.all([
    db.agent.findMany({ select: { id: true, name: true } }),
    db.phoneNumber.findMany({ where: { outbound: true }, select: { id: true, e164: true } }),
  ]);

  if (agents.length === 0 || phones.length === 0) {
    return (
      <>
        {header}
        <div className="flex flex-1 items-center justify-center p-8">
          <StateCard
            icon={<Bot />}
            title={t("setupRequired.title")}
            description={t("setupRequired.description")}
            actions={
              <>
                <Button asChild>
                  <Link href="/agents/new">
                    <Plus className="size-4" />
                    {t("setupRequired.createAgent")}
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/settings/telephony">
                    <Phone className="size-4" />
                    {t("setupRequired.connectNumber")}
                  </Link>
                </Button>
              </>
            }
          />
        </div>
      </>
    );
  }

  return (
    <>
      {header}
      <div className="flex flex-1 justify-center overflow-y-auto p-6 md:p-8">
        <div className="w-full max-w-2xl">
          <NewCampaignForm agents={agents} phones={phones} />
        </div>
      </div>
    </>
  );
}
