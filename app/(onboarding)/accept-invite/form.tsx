"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { Result } from "@/lib/types/result";

import { acceptInviteAction } from "./actions";

export function AcceptInviteForm({ token }: { token: string }) {
  const router = useRouter();

  const [state, runAccept, pending] = useActionState<Result | null>(
    async () => acceptInviteAction(token),
    null,
  );

  useEffect(() => {
    if (state && state.ok) {
      toast.success("Bem-vindo!");
      router.push("/dashboard");
      router.refresh();
    }
  }, [state, router]);

  const error = state && !state.ok ? state.error : null;

  return (
    <div className="space-y-3">
      <form
        action={() => {
          // useActionState's bound action runs as part of a transition without
          // FormData; we wrap in a `<form action>` so React threads the
          // pending state correctly.
          runAccept();
        }}
      >
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aceitar convite"}
        </Button>
      </form>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </div>
  );
}
