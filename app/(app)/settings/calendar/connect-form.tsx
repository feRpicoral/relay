"use client";

import { Loader2 } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { startCalcomOAuthAction } from "./actions";

export function ConnectForm() {
  const [pending, startTransition] = useTransition();

  function onConnect() {
    startTransition(async () => {
      const result = await startCalcomOAuthAction();
      if (result.ok) {
        window.location.href = result.url;
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Button onClick={onConnect} disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Conectar Cal.com"}
    </Button>
  );
}
