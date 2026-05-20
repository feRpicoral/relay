"use client";

import { Loader2, Plus } from "lucide-react";
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

import { addPhoneNumberAction } from "./actions";

export function PhoneNumberForm({ agents }: { agents: Array<{ id: string; name: string }> }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const [e164, setE164] = useState("");
  const [label, setLabel] = useState("");
  const [agentId, setAgentId] = useState<string>(agents[0]?.id ?? "");

  function onSubmit() {
    startTransition(async () => {
      const result = await addPhoneNumberAction({ e164, label, agentId });
      if (result.ok) {
        toast.success("Número conectado");
        setE164("");
        setLabel("");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <form
      className="grid items-end gap-3 md:grid-cols-[1fr_1fr_auto_auto]"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="e164">Número (E.164)</Label>
        <Input
          id="e164"
          value={e164}
          onChange={(e) => setE164(e.target.value)}
          placeholder="+5511999998888"
          required
          disabled={pending}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="label">Apelido</Label>
        <Input
          id="label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Recepção principal"
          disabled={pending}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="agent">Agente</Label>
        <Select
          value={agentId}
          onValueChange={setAgentId}
          disabled={pending || agents.length === 0}
        >
          <SelectTrigger id="agent" className="w-52">
            <SelectValue placeholder="Selecione um agente" />
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
      <Button type="submit" disabled={pending || agents.length === 0}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Conectar
      </Button>
    </form>
  );
}
