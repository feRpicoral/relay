"use client";

import { Loader2 } from "lucide-react";
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
import type { Result } from "@/lib/types/result";

import { createAgentAction } from "./actions";

type State = Result<{ agentId: string }> | null;

export function NewAgentForm() {
  const t = useTranslations("agents.new.form");
  const router = useRouter();
  const [language, setLanguage] = useState<"PT_BR" | "EN_US">("PT_BR");
  const [name, setName] = useState(t("defaultName"));
  const [persona, setPersona] = useState("");
  const [greeting, setGreeting] = useState(t("defaultGreeting"));

  const [state, runSubmit, pending] = useActionState<State>(
    async () => createAgentAction({ name, language, personaPrompt: persona, greeting }),
    null,
  );

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(t("toastCreated"));
      router.push(`/agents/${state.agentId}`);
    } else {
      toast.error(state.error);
    }
  }, [state, router, t]);

  return (
    <form action={() => runSubmit()} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="name">{t("nameLabel")}</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("namePlaceholder")}
          required
          disabled={pending}
        />
        <p className="text-muted-foreground text-xs">{t("nameHint")}</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="language">{t("languageLabel")}</Label>
        <Select
          value={language}
          onValueChange={(v) => setLanguage(v as "PT_BR" | "EN_US")}
          disabled={pending}
        >
          <SelectTrigger id="language">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PT_BR">Português (Brasil)</SelectItem>
            <SelectItem value="EN_US">English (US)</SelectItem>
          </SelectContent>
        </Select>
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
        <p className="text-muted-foreground text-xs">{t("greetingHint")}</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="persona">{t("personaLabel")}</Label>
        <Textarea
          id="persona"
          value={persona}
          onChange={(e) => setPersona(e.target.value)}
          placeholder={t("personaPlaceholder")}
          rows={4}
          disabled={pending}
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("submit")}
      </Button>
    </form>
  );
}
