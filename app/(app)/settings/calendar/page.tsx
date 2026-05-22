import { CalendarCheck2, ExternalLink } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db/with-org";

import { ConnectForm } from "./connect-form";
import { DefaultEventTypePicker } from "./event-type-picker";

export default async function CalendarSettingsPage() {
  const session = await requireAdmin();
  const t = await getTranslations("settings.calendar");

  const db = getDb(session.orgId);
  const connection = await db.calcomConnection.findUnique({ where: { orgId: session.orgId } });

  // A connection row with no encrypted key is a stale leftover — migration
  // 0002_calcom_encrypt_api_key dropped the plaintext column without rewriting
  // existing rows, and the underlying Cal.com client throws
  // `calcom_not_configured` until the user re-pastes the key.

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} className="border-0 px-0" />

      {connection && connection.apiKeyEncrypted ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-3">
              <div className="bg-success/10 text-success flex h-10 w-10 items-center justify-center rounded-lg">
                <CalendarCheck2 className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>{t("connect.toastConnected")}</CardTitle>
                <p className="text-muted-foreground text-xs">
                  {connection.calcomUserEmail ?? t("connect.apiKeyHint")}, {connection.timezone}
                </p>
              </div>
            </div>
            <Badge variant="success">{t("eventType.label")}</Badge>
          </CardHeader>
          <div className="space-y-4 px-6 pb-6">
            <DefaultEventTypePicker currentEventTypeId={connection.defaultEventTypeId} />
            <Button asChild variant="outline" size="sm">
              <a href="https://app.cal.com" target="_blank" rel="noreferrer">
                Cal.com
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </Card>
      ) : (
        <Empty
          icon={<CalendarCheck2 className="h-5 w-5" />}
          title={t("connect.title")}
          description={t("connect.apiKeyHint")}
          action={<ConnectForm />}
        />
      )}
    </div>
  );
}
