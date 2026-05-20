"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

import { updateAgentSettingsAction } from "./actions";

interface AgentInitial {
  id: string;
  name: string;
  language: "PT_BR" | "EN_US" | "AUTO";
  personaPrompt: string;
  greeting: string;
  fallbackTransferE164: string | null;
  enabled: boolean;
}

export function AgentSettingsForm({ agent }: { agent: AgentInitial }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const [name, setName] = useState(agent.name);
  const [language, setLanguage] = useState(agent.language);
  const [persona, setPersona] = useState(agent.personaPrompt);
  const [greeting, setGreeting] = useState(agent.greeting);
  const [fallback, setFallback] = useState(agent.fallbackTransferE164 ?? "");
  const [enabled, setEnabled] = useState(agent.enabled);

  function onSubmit() {
    startTransition(async () => {
      const result = await updateAgentSettingsAction({
        agentId: agent.id,
        name,
        language,
        personaPrompt: persona,
        greeting,
        fallbackTransferE164: fallback.trim() || null,
        enabled,
      });
      if (result.ok) {
        toast.success("Salvo");
        router.refresh();
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
      <div className="border-border bg-card/40 flex items-center justify-between rounded-md border px-4 py-3">
        <div>
          <Label htmlFor="enabled" className="text-sm">
            Agente ativo
          </Label>
          <p className="text-muted-foreground text-xs">
            Quando desativado, chamadas recebem mensagem de indisponibilidade.
          </p>
        </div>
        <Switch id="enabled" checked={enabled} onCheckedChange={setEnabled} disabled={pending} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="name">Nome</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          disabled={pending}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="language">Idioma</Label>
        <Select
          value={language}
          onValueChange={(v) => setLanguage(v as AgentInitial["language"])}
          disabled={pending}
        >
          <SelectTrigger id="language">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PT_BR">Português (Brasil)</SelectItem>
            <SelectItem value="EN_US">English (US)</SelectItem>
            <SelectItem value="AUTO">Auto-detectar</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="greeting">Saudação inicial</Label>
        <Input
          id="greeting"
          value={greeting}
          onChange={(e) => setGreeting(e.target.value)}
          disabled={pending}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="persona">Persona</Label>
        <Textarea
          id="persona"
          value={persona}
          onChange={(e) => setPersona(e.target.value)}
          rows={6}
          disabled={pending}
          placeholder="Você é a recepcionista..."
        />
        <p className="text-muted-foreground text-xs">
          Vira parte do system prompt. Use cache prompt (sempre estável) — evite informações que
          mudam por chamada.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="fallback">Número de transferência humana</Label>
        <Input
          id="fallback"
          value={fallback}
          onChange={(e) => setFallback(e.target.value)}
          placeholder="+5511999998888"
          disabled={pending}
        />
        <p className="text-muted-foreground text-xs">
          Quando o agente usar a tool <code>transfer_to_human</code>, transferimos pra esse número.
        </p>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
      </Button>
    </form>
  );
}
