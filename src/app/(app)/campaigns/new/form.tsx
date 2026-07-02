"use client";

import { Loader2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { CsvPreview } from "@/components/campaigns/csv-preview";
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
import { Stepper } from "@/components/ui/stepper";
import { Textarea } from "@/components/ui/textarea";
import { parseLeads } from "@/lib/campaigns/parse-leads";
import { cn } from "@/lib/utils";

import { createCampaignAction } from "./actions";

const MAX_ATTEMPTS = { min: 1, max: 10 };
const COOLDOWN = { min: 5, max: 1440, step: 5 };
const CONCURRENCY = { min: 1, max: 10 };

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [agentId, setAgentId] = useState(agents[0]?.id ?? "");
  const [fromE164, setFromE164] = useState(phones[0]?.e164 ?? "");
  const [scriptPrompt, setScriptPrompt] = useState("");
  const [csv, setCsv] = useState("");
  const [dragging, setDragging] = useState(false);
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [cooldownMinutes, setCooldownMinutes] = useState(60);
  const [concurrencyLimit, setConcurrencyLimit] = useState(2);

  const parsed = useMemo(() => (csv.trim() ? parseLeads(csv) : null), [csv]);

  function readFile(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCsv(typeof reader.result === "string" ? reader.result : "");
    reader.readAsText(file);
  }

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

  const canSubmit = !pending && name.trim().length >= 2 && (parsed?.valid.length ?? 0) > 0;

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="name">
          {t("nameLabel")} <span className="text-destructive">{t("nameRequired")}</span>
        </Label>
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
                  <span className="font-mono">{p.e164}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="script">{t("scriptPromptLabel")}</Label>
        <Textarea
          id="script"
          value={scriptPrompt}
          onChange={(e) => setScriptPrompt(e.target.value)}
          rows={3}
          placeholder={t("scriptPromptPlaceholder")}
          disabled={pending}
        />
      </div>

      <div className="space-y-2.5">
        <Label>{t("leadsLabel")}</Label>
        <div
          className={cn(
            "bg-secondary flex items-center gap-3 rounded-lg border border-dashed p-4 transition-colors",
            dragging ? "border-primary" : "border-border",
          )}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            readFile(e.dataTransfer.files[0]);
          }}
          onPaste={(e) => {
            const text = e.clipboardData.getData("text");
            if (text) setCsv(text);
          }}
        >
          <Upload className="text-muted-foreground size-5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-foreground text-sm font-medium">{t("leadsDropTitle")}</p>
            <p className="text-muted-foreground text-xs">{t("leadsDropHint")}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => fileInputRef.current?.click()}
          >
            {t("chooseFile")}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => readFile(e.target.files?.[0])}
          />
        </div>

        {csv.trim() ? (
          <Textarea
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            rows={4}
            className="font-mono text-xs"
            disabled={pending}
            aria-label={t("leadsLabel")}
          />
        ) : null}

        {parsed ? <CsvPreview parsed={parsed} /> : null}
      </div>

      <div className="space-y-2">
        <Label>{t("callingRules")}</Label>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="max-attempts" className="text-muted-foreground text-xs font-normal">
              {t("maxAttemptsLabel")}
            </Label>
            <Stepper
              id="max-attempts"
              value={maxAttempts}
              onChange={setMaxAttempts}
              min={MAX_ATTEMPTS.min}
              max={MAX_ATTEMPTS.max}
              aria-label={t("maxAttemptsLabel")}
            />
            <p className="text-muted-foreground text-xs">{t("maxAttemptsHint")}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cooldown" className="text-muted-foreground text-xs font-normal">
              {t("cooldownLabel")}
            </Label>
            <Stepper
              id="cooldown"
              value={cooldownMinutes}
              onChange={setCooldownMinutes}
              min={COOLDOWN.min}
              max={COOLDOWN.max}
              step={COOLDOWN.step}
              aria-label={t("cooldownLabel")}
            />
            <p className="text-muted-foreground text-xs">{t("cooldownHint")}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="concurrency" className="text-muted-foreground text-xs font-normal">
              {t("concurrencyLabel")}
            </Label>
            <Stepper
              id="concurrency"
              value={concurrencyLimit}
              onChange={setConcurrencyLimit}
              min={CONCURRENCY.min}
              max={CONCURRENCY.max}
              aria-label={t("concurrencyLabel")}
            />
            <p className="text-muted-foreground text-xs">{t("concurrencyHint")}</p>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2.5">
        <Button
          type="button"
          variant="ghost"
          disabled={pending}
          onClick={() => router.push("/campaigns")}
        >
          {t("cancel")}
        </Button>
        <Button type="submit" disabled={!canSubmit}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          {t("submit")}
        </Button>
      </div>
    </form>
  );
}
