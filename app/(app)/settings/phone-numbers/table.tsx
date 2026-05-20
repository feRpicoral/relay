"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { assignAgentAction, removePhoneNumberAction } from "./actions";

interface Row {
  id: string;
  e164: string;
  label: string | null;
  agentId: string | null;
  agentName: string | null;
}

export function PhoneNumberTable({
  numbers,
  agents,
}: {
  numbers: Row[];
  agents: Array<{ id: string; name: string }>;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function onChangeAgent(phoneNumberId: string, agentId: string) {
    startTransition(async () => {
      const result = await assignAgentAction({ phoneNumberId, agentId });
      if (result.ok) {
        toast.success("Agente atualizado");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function onRemove(phoneNumberId: string) {
    startTransition(async () => {
      const result = await removePhoneNumberAction({ phoneNumberId });
      if (result.ok) {
        toast.success("Número desconectado");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Card>
      <div className="divide-border divide-y">
        {numbers.map((row) => (
          <div key={row.id} className="flex items-center justify-between gap-4 px-5 py-4">
            <div>
              <p className="font-mono text-sm">{row.e164}</p>
              <p className="text-muted-foreground text-xs">{row.label ?? "-"}</p>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={row.agentId ?? ""}
                onValueChange={(v) => onChangeAgent(row.id, v)}
                disabled={pending}
              >
                <SelectTrigger className="w-52">
                  <SelectValue placeholder="Sem agente" />
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
                variant="ghost"
                size="icon-sm"
                onClick={() => onRemove(row.id)}
                disabled={pending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
