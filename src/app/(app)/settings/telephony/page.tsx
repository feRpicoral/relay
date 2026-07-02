import { getTranslations } from "next-intl/server";

import { AdminLockedNotice } from "@/components/settings/admin-locked-notice";
import { Card, CardContent } from "@/components/ui/card";
import { requireSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/with-org";
import { getConnectionStatus } from "@/lib/telephony/connection";
import { type AvailableNumber, listAvailableNumbers } from "@/lib/telephony/provisioning";

import { ConnectForm } from "./connect-form";
import { ConnectedPanel } from "./connected-panel";

export default async function TelephonyPage() {
  const session = await requireSession();

  if (session.role !== "ADMIN") {
    return <AdminLockedNotice />;
  }

  const t = await getTranslations("settings.telephony.connect");

  const status = await getConnectionStatus(session.orgId);
  if (!status.connected) {
    return (
      <div className="max-w-xl">
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-base font-semibold">{t("title")}</h2>
            <p className="text-muted-foreground mt-1 mb-4 text-sm">{t("description")}</p>
            <ConnectForm />
          </CardContent>
        </Card>
      </div>
    );
  }

  const db = getDb(session.orgId);
  const agents = await db.agent.findMany({ select: { id: true, name: true } });

  let numbers: AvailableNumber[] = [];
  let listError: string | null = null;
  try {
    numbers = await listAvailableNumbers(session.orgId);
  } catch (err) {
    listError = err instanceof Error ? err.message : String(err);
  }

  return (
    <ConnectedPanel
      accountSid={status.accountSid!}
      accountName={status.accountName}
      twilioTrunkSid={status.twilioTrunkSid}
      livekitOutboundTrunkId={status.livekitOutboundTrunkId}
      numbers={numbers}
      agents={agents}
      listError={listError}
    />
  );
}
