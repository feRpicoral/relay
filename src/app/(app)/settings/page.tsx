import { Lock } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { CopyButton } from "@/components/settings/copy-button";
import { KvRow } from "@/components/settings/kv-row";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db/client";

export default async function OrgSettingsPage() {
  const session = await requireSession();
  const t = await getTranslations("settings.organization");
  const tLanguage = await getTranslations("enums.agentLanguageShort");

  const [org, memberCount] = await Promise.all([
    getPrisma().organization.findUniqueOrThrow({
      where: { id: session.orgId },
      select: { id: true, name: true, timezone: true, defaultAgentLanguage: true },
    }),
    getPrisma().membership.count({ where: { orgId: session.orgId } }),
  ]);

  return (
    <div className="max-w-3xl space-y-2.5">
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 py-4">
          <CardTitle>{t("title")}</CardTitle>
          <Badge variant="secondary" className="gap-1 font-normal">
            <Lock className="size-3" aria-hidden />
            {t("readOnly")}
          </Badge>
        </CardHeader>
        <div className="px-6 pb-2">
          <KvRow label={t("nameLabel")}>{org.name}</KvRow>
          <KvRow label={t("workspaceIdLabel")} valueClassName="font-mono text-xs">
            {org.id}
            <CopyButton value={org.id} />
          </KvRow>
          <KvRow label={t("timezoneLabel")}>{org.timezone}</KvRow>
          <KvRow label={t("defaultLanguageLabel")}>{tLanguage(org.defaultAgentLanguage)}</KvRow>
          <KvRow label={t("membersLabel")}>{memberCount}</KvRow>
        </div>
      </Card>
      <p className="text-muted-foreground px-1 text-xs">{t("readOnlyHint")}</p>
    </div>
  );
}
