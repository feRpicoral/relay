"use client";

import { AlertTriangle, Loader2, Mic } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useState } from "react";
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
import { cn } from "@/lib/utils";

import { createAgentAction, type CreateAgentResult } from "./actions";

type Language = "PT_BR" | "EN_US";
type State = CreateAgentResult | null;

export function NewAgentForm({ defaultLanguage }: { defaultLanguage: Language }) {
  const t = useTranslations("agents.new.form");
  const router = useRouter();
  const [language, setLanguage] = useState<Language>(defaultLanguage);
  const [name, setName] = useState("");
  const [persona, setPersona] = useState("");
  const [greeting, setGreeting] = useState("");

  const [state, runSubmit, pending] = useActionState<State>(
    async () => createAgentAction({ name, language, personaPrompt: persona, greeting }),
    null,
  );

  useEffect(() => {
    if (state?.ok) {
      toast.success(t("toastCreated"));
      router.push(`/agents/${state.agentId}`);
    }
  }, [state, router, t]);

  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={() => runSubmit()} className={cn("space-y-4", pending && "opacity-70")}>
      <div className="space-y-2">
        <Label htmlFor="name">
          {t("nameLabel")} <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("namePlaceholder")}
          aria-invalid={fieldErrors?.name ? true : undefined}
          className={cn(fieldErrors?.name && "border-destructive focus-visible:ring-destructive")}
          disabled={pending}
        />
        {fieldErrors?.name ? (
          <p className="text-destructive flex items-center gap-1.5 text-xs">
            <AlertTriangle className="size-3" />
            {fieldErrors.name}
          </p>
        ) : (
          <p className="text-muted-foreground text-xs">{t("nameHint")}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="language">{t("languageLabel")}</Label>
        <Select
          value={language}
          onValueChange={(v) => setLanguage(v as Language)}
          disabled={pending}
        >
          <SelectTrigger id="language">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PT_BR">Português (Brasil) · PT-BR</SelectItem>
            <SelectItem value="EN_US">English (US) · EN-US</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-muted-foreground text-xs">{t("languageHint")}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="greeting">{t("greetingLabel")}</Label>
        <Input
          id="greeting"
          value={greeting}
          onChange={(e) => setGreeting(e.target.value)}
          placeholder={t("greetingPlaceholder")}
          disabled={pending}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="persona">
          {t("personaLabel")} <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="persona"
          value={persona}
          onChange={(e) => setPersona(e.target.value)}
          placeholder={t("personaPlaceholder")}
          rows={4}
          aria-invalid={fieldErrors?.personaPrompt ? true : undefined}
          className={cn(
            fieldErrors?.personaPrompt && "border-destructive focus-visible:ring-destructive",
          )}
          disabled={pending}
        />
        {fieldErrors?.personaPrompt ? (
          <p className="text-destructive flex items-center gap-1.5 text-xs">
            <AlertTriangle className="size-3" />
            {fieldErrors.personaPrompt}
          </p>
        ) : null}
      </div>

      <div className="text-muted-foreground flex items-center gap-2 text-xs">
        <Mic className="size-3.5 shrink-0" />
        {t("pausedHint")}
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push("/agents")}
          disabled={pending}
        >
          {t("cancel")}
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {t("creating")}
            </>
          ) : (
            t("submit")
          )}
        </Button>
      </div>
    </form>
  );
}
