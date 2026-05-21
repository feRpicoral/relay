"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Result } from "@/lib/types/result";

import { connectCalcomAction } from "./actions";

export function ConnectForm() {
  const router = useRouter();
  const [apiKey, setApiKey] = useState("");

  const [state, runConnect, pending] = useActionState<Result | null>(
    async () => connectCalcomAction({ apiKey }),
    null,
  );

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success("Cal.com conectado");
      router.refresh();
    } else {
      toast.error(state.error);
    }
  }, [state, router]);

  return (
    <form action={() => runConnect()} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="calcom-api-key">Cal.com API key</Label>
        <Input
          id="calcom-api-key"
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="cal_live_..."
          autoComplete="off"
          disabled={pending}
        />
        <p className="text-muted-foreground text-xs">
          Gere em Cal.com em Settings, Security, API Keys.
        </p>
      </div>
      <Button type="submit" disabled={pending || !apiKey}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Conectar Cal.com"}
      </Button>
    </form>
  );
}
