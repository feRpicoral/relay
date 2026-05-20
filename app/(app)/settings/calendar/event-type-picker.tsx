"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { setDefaultEventTypeAction } from "./actions";

export function DefaultEventTypePicker({
  currentEventTypeId,
  orgId,
}: {
  currentEventTypeId: number | null;
  orgId: string;
}) {
  void orgId;
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const [value, setValue] = useState(currentEventTypeId?.toString() ?? "");

  function onSave() {
    const parsed = parseInt(value, 10);
    if (Number.isNaN(parsed)) {
      toast.error("Use um número.");
      return;
    }
    startTransition(async () => {
      const result = await setDefaultEventTypeAction({ eventTypeId: parsed });
      if (result.ok) {
        toast.success("Event type atualizado");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="event-type-id">Event type ID padrão</Label>
      <div className="flex gap-2">
        <Input
          id="event-type-id"
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Ex: 12345"
          disabled={pending}
        />
        <Button onClick={onSave} disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
        </Button>
      </div>
      <p className="text-muted-foreground text-xs">
        Quando o agente faz tool_call book_appointment, usa esse event type. Você encontra o id em
        Cal.com → Event types.
      </p>
    </div>
  );
}
