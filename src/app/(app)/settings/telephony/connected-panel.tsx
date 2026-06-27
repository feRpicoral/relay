"use client";

import { CheckCircle2, ExternalLink, Loader2, Unplug } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { CopyButton } from "@/components/settings/copy-button";
import { KvRow } from "@/components/settings/kv-row";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dot } from "@/components/ui/dot";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatPhone } from "@/lib/utils";

import { attachNumberAction, detachNumberAction, disconnectTwilioAction } from "./actions";

const TWILIO_BUY_NUMBER_URL = "https://console.twilio.com/us1/develop/phone-numbers/manage/search";

interface NumberRow {
  twilioSid: string;
  e164: string;
  friendlyName: string;
  inbound: boolean;
  outbound: boolean;
  assignedAgentId: string | null;
  phoneNumberId: string | null;
}

interface ConnectedPanelProps {
  accountSid: string;
  accountName: string | null;
  twilioTrunkSid: string | null;
  livekitOutboundTrunkId: string | null;
  numbers: NumberRow[];
  agents: Array<{ id: string; name: string }>;
  listError: string | null;
}

export function ConnectedPanel({
  accountSid,
  accountName,
  twilioTrunkSid,
  livekitOutboundTrunkId,
  numbers,
  agents,
  listError,
}: ConnectedPanelProps) {
  const t = useTranslations("settings.telephony");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const healthy = Boolean(twilioTrunkSid) && Boolean(livekitOutboundTrunkId);

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
    <div className="max-w-3xl space-y-4">
      <div className="border-border bg-card overflow-hidden rounded-xl border shadow-sm">
        <div className="border-border/60 flex items-center justify-between border-b px-5 py-3">
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-semibold">{t("connected.title")}</span>
            <span className="text-success inline-flex items-center gap-1.5 text-xs font-medium">
              <Dot tone="success" />
              {t("connected.status")}
            </span>
          </div>
          <ConfirmDialog
            trigger={
              <Button
                variant="outline"
                size="sm"
                disabled={pending}
                className="text-destructive border-destructive/35 hover:text-destructive"
              >
                <Unplug className="h-4 w-4" />
                {t("connected.disconnect")}
              </Button>
            }
            title={t("connected.confirmDisconnectTitle")}
            description={t("connected.confirmDisconnectDescription")}
            confirmLabel={t("connected.confirmDisconnect")}
            cancelLabel={t("connected.keepConnected")}
            pending={pending}
            onConfirm={onDisconnect}
          />
        </div>
        <div className="px-5 pb-2">
          <KvRow label={t("connected.accountNameLabel")}>{accountName ?? "—"}</KvRow>
          <KvRow label={t("connected.accountSidLabel")} valueClassName="font-mono text-xs">
            {accountSid}
            <CopyButton value={accountSid} />
          </KvRow>
          <KvRow label={t("connected.trunkSidLabel")} valueClassName="font-mono text-xs">
            {twilioTrunkSid ?? "—"}
            {twilioTrunkSid ? <CopyButton value={twilioTrunkSid} /> : null}
          </KvRow>
          <KvRow label={t("connected.livekitTrunkLabel")} valueClassName="font-mono text-xs">
            {livekitOutboundTrunkId ?? "—"}
            {livekitOutboundTrunkId ? <CopyButton value={livekitOutboundTrunkId} /> : null}
          </KvRow>
          <KvRow label={t("connected.diagnosticsLabel")}>
            {healthy ? (
              <span className="text-success inline-flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5" aria-hidden />
                {t("connected.healthy")}
              </span>
            ) : (
              <span className="text-muted-foreground">{t("connected.pendingSetup")}</span>
            )}
          </KvRow>
        </div>
      </div>

      <div className="border-border bg-card overflow-hidden rounded-xl border shadow-sm">
        <div className="border-border/60 flex items-center justify-between border-b px-5 py-3">
          <span className="text-sm font-semibold">{t("numbers.title")}</span>
          <Button asChild variant="ghost" size="sm" className="text-primary">
            <a href={TWILIO_BUY_NUMBER_URL} target="_blank" rel="noreferrer">
              {t("numbers.buyNumber")}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
        </div>
        <div className="px-5 pb-2">
          {listError ? (
            <p className="text-destructive py-3 text-sm">{listError}</p>
          ) : numbers.length === 0 ? (
            <p className="text-muted-foreground py-3 text-sm">{t("numbers.empty")}</p>
          ) : (
            numbers.map((n) => <NumberItem key={n.twilioSid} number={n} agents={agents} />)
          )}
        </div>
      </div>
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
  const t = useTranslations("settings.telephony.numbers");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selectedAgentId, setSelectedAgentId] = useState<string>(
    number.assignedAgentId ?? agents[0]?.id ?? "",
  );

  const attached = number.phoneNumberId !== null;
  const attachedAgentName = attached
    ? (agents.find((a) => a.id === number.assignedAgentId)?.name ?? t("unassigned"))
    : null;

  function onAttach() {
    if (!selectedAgentId) {
      toast.error(t("selectAgent"));
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

  function onDetach() {
    if (!number.phoneNumberId) return;
    const phoneNumberId = number.phoneNumberId;
    startTransition(async () => {
      const result = await detachNumberAction({ phoneNumberId });
      if (result.ok) {
        toast.success(t("detachedToast", { number: number.e164 }));
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="border-border/60 flex flex-wrap items-center justify-between gap-3 border-b py-3 last:border-b-0">
      <div className="flex items-center gap-2 text-sm font-medium">
        {formatPhone(number.e164)}
        {number.inbound ? (
          <Badge variant="outline" className="text-[10px] tracking-wide">
            {t("inbound")}
          </Badge>
        ) : null}
        {number.outbound ? (
          <Badge variant="outline" className="text-[10px] tracking-wide">
            {t("outbound")}
          </Badge>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        {attached ? (
          <>
            <span className="text-muted-foreground max-w-44 truncate text-xs">
              {attachedAgentName}
            </span>
            <Button variant="outline" size="sm" onClick={onDetach} disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t("detach")}
            </Button>
          </>
        ) : (
          <>
            <Select value={selectedAgentId} onValueChange={setSelectedAgentId} disabled={pending}>
              <SelectTrigger className="h-8 w-44 text-xs" aria-label={t("agentLabel")}>
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
            <Button
              variant="outline"
              size="sm"
              onClick={onAttach}
              disabled={pending || !selectedAgentId}
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t("attach")}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
