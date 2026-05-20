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
import { Textarea } from "@/components/ui/textarea";

import { createAgentAction } from "./actions";

export function NewAgentForm() {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const [language, setLanguage] = useState<"PT_BR" | "EN_US">("PT_BR");
  const [name, setName] = useState("Recepcionista");
  const [persona, setPersona] = useState("");
  const [greeting, setGreeting] = useState("Olá! Obrigada por ligar. Como posso ajudar?");

  function onSubmit() {
    startTransition(async () => {
      const result = await createAgentAction({ name, language, personaPrompt: persona, greeting });
      if (result.ok) {
        toast.success("Agente criado");
        router.push(`/agents/${result.agentId}`);
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
        <Label htmlFor="name">Nome do agente</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Recepcionista da Clínica Lumen"
          required
          disabled={pending}
        />
        <p className="text-muted-foreground text-xs">
          Só usado internamente — o cliente nunca vê esse nome.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="language">Idioma principal</Label>
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
        <Label htmlFor="greeting">Saudação inicial</Label>
        <Input
          id="greeting"
          value={greeting}
          onChange={(e) => setGreeting(e.target.value)}
          placeholder="Olá! Obrigada por ligar."
          disabled={pending}
        />
        <p className="text-muted-foreground text-xs">A primeira frase do agente quando atende.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="persona">Persona</Label>
        <Textarea
          id="persona"
          value={persona}
          onChange={(e) => setPersona(e.target.value)}
          placeholder="Ex: Você é a recepcionista da Clínica Lumen, especializada em ortopedia. Seja calorosa e direta."
          rows={4}
          disabled={pending}
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar agente"}
      </Button>
    </form>
  );
}
