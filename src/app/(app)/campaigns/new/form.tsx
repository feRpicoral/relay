"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { createCampaignAction } from "./actions";

export function NewCampaignForm({
  agents,
  phones,
}: {
  agents: Array<{ id: string; name: string }>;
  phones: Array<{ id: string; e164: string }>;
}) {
  const t = useTranslations("campaigns.new.form");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const [name, setName] = useState("");
  const [agentId, setAgentId] = useState(agents[0]?.id ?? "");
  const [fromE164, setFromE164] = useState(phones[0]?.e164 ?? "");
  const [scriptPrompt, setScriptPrompt] = useState("");
  const [csv, setCsv] = useState("");
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [cooldownMinutes, setCooldownMinutes] = useState(60);
  const [concurrencyLimit, setConcurrencyLimit] = useState(2);

  function onSubmit() {
    startTransition(async () => {
      const result = await createCampaignAction({
        name,
        agentId,
        fromPhoneNumberE164: fromE164,
        scriptPrompt,
        csv,
        maxAttempts,
        cooldownMinutes,
        concurrencyLimit,
      });
      if (result.ok) {
        toast.success(t("toastCreated"));
        router.push(`/campaigns/${result.campaignId}`);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="name">{t("nameLabel")}</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          disabled={pending}
          placeholder={t("namePlaceholder")}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="agent">{t("agentLabel")}</Label>
          <Select value={agentId} onValueChange={setAgentId} disabled={pending}>
            <SelectTrigger id="agent">
              <SelectValue placeholder={t("agentPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {agents.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="from">{t("fromNumberLabel")}</Label>
          <Select value={fromE164} onValueChange={setFromE164} disabled={pending}>
            <SelectTrigger id="from">
              <SelectValue placeholder={t("fromNumberPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {phones.map((p) => (
                <SelectItem key={p.id} value={p.e164}>
                  {p.e164}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="script">{t("scriptLabel")}</Label>
        <Textarea
          id="script"
          value={scriptPrompt}
          onChange={(e) => setScriptPrompt(e.target.value)}
          rows={3}
          placeholder={t("scriptPlaceholder")}
          disabled={pending}
        />
        <p className="text-muted-foreground text-xs">{t("scriptHint")}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="max-attempts">{t("scriptLabel")}</Label>
          <Input
            id="max-attempts"
            type="number"
            min={1}
            max={10}
            value={maxAttempts}
            onChange={(e) => setMaxAttempts(parseInt(e.target.value, 10) || 1)}
            disabled={pending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cooldown">{t("scriptLabel")}</Label>
          <Input
            id="cooldown"
            type="number"
            min={5}
            max={1440}
            value={cooldownMinutes}
            onChange={(e) => setCooldownMinutes(parseInt(e.target.value, 10) || 30)}
            disabled={pending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="concurrency">{t("scriptLabel")}</Label>
          <Input
            id="concurrency"
            type="number"
            min={1}
            max={10}
            value={concurrencyLimit}
            onChange={(e) => setConcurrencyLimit(parseInt(e.target.value, 10) || 1)}
            disabled={pending}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="csv">{t("leadsLabel")}</Label>
        <Textarea
          id="csv"
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          rows={6}
          placeholder="phone,name&#10;+5511999998888,João Silva"
          className="font-mono text-xs"
          disabled={pending}
        />
        <p className="text-muted-foreground text-xs">{t("leadsHint")}</p>
      </div>
      <Button type="submit" disabled={pending || !name || !csv}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("submit")}
      </Button>
    </form>
  );
}
