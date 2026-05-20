"use client";

import { Loader2, PhoneCall } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { startTestCallAction } from "./test-actions";

export function TestCallButton({ agentId }: { agentId: string }) {
  const [pending, startTransition] = useTransition();
  const [_callId, setCallId] = useState<string | null>(null);
  const router = useRouter();

  function onClick() {
    startTransition(async () => {
      const result = await startTestCallAction({ agentId });
      if (result.ok) {
        setCallId(result.callId);
        toast.success("Teste iniciado", {
          description: "Abrindo o monitor ao vivo...",
        });
        router.push(`/calls/${result.callId}/live`);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Button onClick={onClick} disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PhoneCall className="h-4 w-4" />}
      Teste no navegador
    </Button>
  );
}
