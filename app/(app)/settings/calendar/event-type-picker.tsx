"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { listEventTypesAction, setDefaultEventTypeAction } from "./actions";

export function DefaultEventTypePicker({
  currentEventTypeId,
}: {
  currentEventTypeId: number | null;
}) {
  const [pending, startTransition] = useTransition();
  const [eventTypes, setEventTypes] = useState<Array<{ id: number; title: string }>>([]);
  const [value, setValue] = useState(currentEventTypeId?.toString() ?? "");
  const [loadError, setLoadError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    void (async () => {
      const result = await listEventTypesAction();
      if (result.ok) {
        setEventTypes(result.eventTypes);
      } else {
        setLoadError(result.error);
      }
    })();
  }, []);

  function onSave() {
    const parsed = parseInt(value, 10);
    if (Number.isNaN(parsed)) {
      toast.error("Selecione um event type.");
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

  if (loadError) {
    return (
      <div className="space-y-2">
        <Label>Event type padrão</Label>
        <p className="text-destructive text-sm">{loadError}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="event-type-id">Event type padrão</Label>
      <div className="flex gap-2">
        <Select
          value={value}
          onValueChange={setValue}
          disabled={pending || eventTypes.length === 0}
        >
          <SelectTrigger id="event-type-id" className="flex-1">
            <SelectValue placeholder={eventTypes.length === 0 ? "Carregando..." : "Selecione"} />
          </SelectTrigger>
          <SelectContent>
            {eventTypes.map((et) => (
              <SelectItem key={et.id} value={et.id.toString()}>
                {et.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={onSave} disabled={pending || !value}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
        </Button>
      </div>
      <p className="text-muted-foreground text-xs">
        Quando o agente faz <code>book_appointment</code>, usa esse event type. Crie-os em Cal.com →
        Event Types.
      </p>
    </div>
  );
}
