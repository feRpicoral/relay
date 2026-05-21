"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Result } from "@/lib/types/result";

import { loginAction } from "./actions";

type State = Result | { initialError: string } | null;

export function LoginForm({ next, initialError }: { next?: string; initialError?: string }) {
  const [email, setEmail] = useState("");
  const router = useRouter();

  const [state, formAction, pending] = useActionState<State, FormData>(
    async (_prev, formData) => loginAction(formData),
    initialError ? { initialError } : null,
  );

  // Side effects (toast + navigation) run when the action settles. We key on
  // the state value reference so a successful submit fires once.
  useEffect(() => {
    if (!state) return;
    if ("ok" in state && state.ok) {
      toast.success("Link de acesso enviado", {
        description: "Se houver uma conta para esse email, você receberá um link.",
      });
      const params = new URLSearchParams({ email });
      if (next) params.set("next", next);
      router.push(`/auth/check-email?${params.toString()}`);
    }
  }, [state, email, next, router]);

  const error = !state
    ? null
    : "initialError" in state
      ? state.initialError
      : !state.ok
        ? state.error
        : null;

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          autoFocus
          placeholder="voce@empresa.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={pending}
        />
      </div>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            <span className="sr-only">Enviando link</span>
          </>
        ) : (
          "Enviar link de acesso"
        )}
      </Button>
    </form>
  );
}
