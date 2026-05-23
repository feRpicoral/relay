import { Phone } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Empty } from "@/components/ui/empty";
import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db/with-org";
import { getConnectionStatus } from "@/lib/telephony/connection";
import { type AvailableNumber, listAvailableNumbers } from "@/lib/telephony/provisioning";

import { ConnectForm } from "./connect-form";
import { ConnectedPanel } from "./connected-panel";

export default async function TelephonyPage() {
  const session = await requireAdmin();
  const t = await getTranslations("settings.telephony.connect");

  const status = await getConnectionStatus(session.orgId);
  if (!status.connected) {
    return (
      <Empty
        icon={<Phone className="h-5 w-5" />}
        title={t("title")}
        description={t("description")}
        action={<ConnectForm />}
      />
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
      twilioTrunkSid={status.twilioTrunkSid}
      livekitOutboundTrunkId={status.livekitOutboundTrunkId}
      numbers={numbers}
      agents={agents}
      listError={listError}
    />
  );
}
