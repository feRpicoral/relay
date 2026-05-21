import { Phone } from "lucide-react";

import { Empty } from "@/components/ui/empty";
import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db/with-org";
import { getConnectionStatus } from "@/lib/telephony/connection";
import { type AvailableNumber, listAvailableNumbers } from "@/lib/telephony/provisioning";

import { ConnectForm } from "./connect-form";
import { ConnectedPanel } from "./connected-panel";

export default async function TelephonyPage() {
  const session = await requireAdmin();

  const status = await getConnectionStatus(session.orgId);
  if (!status.connected) {
    return (
      <Empty
        icon={<Phone className="h-5 w-5" />}
        title="Conecte sua conta Twilio"
        description="Cole um API Key da Twilio. O Relay configura o SIP trunk e provisiona os números automaticamente. Vá em console.twilio.com, Account, API Keys & tokens, criar Standard Key."
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
