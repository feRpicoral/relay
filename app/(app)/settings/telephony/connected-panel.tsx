"use client";

import { CheckCircle2, Link2Off, Loader2, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatPhone } from "@/lib/utils";

import { attachNumberAction, detachNumberAction, disconnectTwilioAction } from "./actions";

interface NumberRow {
  twilioSid: string;
  e164: string;
  friendlyName: string;
  assignedAgentId: string | null;
  phoneNumberId: string | null;
}

interface ConnectedPanelProps {
  accountSid: string;
  twilioTrunkSid: string | null;
  livekitOutboundTrunkId: string | null;
  numbers: NumberRow[];
  agents: Array<{ id: string; name: string }>;
  listError: string | null;
}

export function ConnectedPanel({
  accountSid,
  twilioTrunkSid,
  livekitOutboundTrunkId,
  numbers,
  agents,
  listError,
}: ConnectedPanelProps) {
  const t = useTranslations("settings.telephony");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  async function onDisconnect() {
    return new Promise<void>((resolve) => {
      startTransition(async () => {
        const result = await disconnectTwilioAction();
        if (result.ok) {
          toast.success(t("connect.toastDisconnected"));
          router.refresh();
        } else {
          toast.error(result.error);
        }
        resolve();
      });
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-3">
            <div className="bg-success/10 text-success flex h-10 w-10 items-center justify-center rounded-lg">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>{t("connect.toastConnected")}</CardTitle>
              <p className="text-muted-foreground font-mono text-xs">{accountSid}</p>
            </div>
          </div>
          <ConfirmDialog
            trigger={
              <Button variant="ghost" size="sm" disabled={pending} className="text-destructive">
                <Link2Off className="h-4 w-4" />
                {t("connected.disconnect")}
              </Button>
            }
            title={t("connected.confirmDisconnectTitle")}
            description={t("connected.confirmDisconnectDescription")}
            confirmLabel={t("connected.confirmDisconnect")}
            pending={pending}
            onConfirm={onDisconnect}
          />
        </CardHeader>
        <div className="text-muted-foreground grid gap-1 px-6 pb-6 font-mono text-xs">
          <div>Twilio Elastic SIP Trunk: {twilioTrunkSid ?? "—"}</div>
          <div>LiveKit outbound trunk: {livekitOutboundTrunkId ?? "—"}</div>
        </div>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Twilio</CardTitle>
        </CardHeader>
        <div className="space-y-3 px-6 pb-6">
          {listError ? (
            <p className="text-destructive text-sm">{listError}</p>
          ) : numbers.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              <a
                className="underline"
                href="https://console.twilio.com/us1/develop/phone-numbers/manage/search"
                target="_blank"
                rel="noreferrer"
              >
                console.twilio.com
              </a>
            </p>
          ) : (
            numbers.map((n) => <NumberItem key={n.twilioSid} number={n} agents={agents} />)
          )}
        </div>
      </Card>
    </div>
  );
}

function NumberItem({
  number,
  agents,
}: {
  number: NumberRow;
  agents: Array<{ id: string; name: string }>;
}) {
  const t = useTranslations("settings.telephony.connected");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selectedAgentId, setSelectedAgentId] = useState<string>(agents[0]?.id ?? "");

  const attached = number.phoneNumberId !== null;

  function onAttach() {
    if (!selectedAgentId) {
      toast.error(t("attachAgent"));
      return;
    }
    startTransition(async () => {
      const result = await attachNumberAction({
        twilioSid: number.twilioSid,
        agentId: selectedAgentId,
      });
      if (result.ok) {
        toast.success(t("attachedToast", { number: number.e164 }));
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  async function onDetach() {
    if (!number.phoneNumberId) return;
    const phoneNumberId = number.phoneNumberId;
    return new Promise<void>((resolve) => {
      startTransition(async () => {
        const result = await detachNumberAction({ phoneNumberId });
        if (result.ok) {
          toast.success(t("detachedToast", { number: number.e164 }));
          router.refresh();
        } else {
          toast.error(result.error);
        }
        resolve();
      });
    });
  }

  const attachedAgent = attached ? agents.find((a) => a.id === number.assignedAgentId)?.name : null;

  return (
    <div className="border-border flex items-center justify-between rounded-md border p-3">
      <div>
        <div className="flex items-center gap-2 text-sm font-medium">
          {formatPhone(number.e164)}
          {attached ? (
            <Badge variant="success" className="text-[10px]">
              {attachedAgent ?? "—"}
            </Badge>
          ) : null}
        </div>
        <div className="text-muted-foreground text-xs">{number.friendlyName}</div>
      </div>
      <div className="flex items-center gap-2">
        {attached ? (
          <ConfirmDialog
            trigger={
              <Button variant="ghost" size="sm" disabled={pending}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                {t("disconnect")}
              </Button>
            }
            title={t("confirmDisconnectTitle")}
            description={t("confirmDisconnectDescription")}
            confirmLabel={t("confirmDisconnect")}
            pending={pending}
            onConfirm={onDetach}
          />
        ) : (
          <>
            <Select value={selectedAgentId} onValueChange={setSelectedAgentId} disabled={pending}>
              <SelectTrigger className="h-9 w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {agents.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={onAttach} disabled={pending || !selectedAgentId}>
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {t("disconnect" /* fallthrough to keep word neutral */)}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
