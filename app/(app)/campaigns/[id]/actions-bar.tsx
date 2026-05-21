"use client";

import { Loader2, Pause, Play, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { cancelCampaignAction, pauseCampaignAction, startCampaignAction } from "./actions";

export function CampaignActions({ campaignId, status }: { campaignId: string; status: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handle(fn: () => Promise<{ ok: true } | { ok: false; error: string }>, msg: string) {
    startTransition(async () => {
      const result = await fn();
      if (result.ok) {
        toast.success(msg);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  if (status === "RUNNING") {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={() => handle(() => pauseCampaignAction({ campaignId }), "Pausada")}
        disabled={pending}
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pause className="h-4 w-4" />}
        Pausar
      </Button>
    );
  }
  if (status === "DRAFT" || status === "PAUSED") {
    return (
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => handle(() => startCampaignAction({ campaignId }), "Campanha iniciada")}
          disabled={pending}
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          Iniciar
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handle(() => cancelCampaignAction({ campaignId }), "Cancelada")}
          disabled={pending}
        >
          <X className="h-4 w-4" />
          Cancelar
        </Button>
      </div>
    );
  }
  return null;
}
