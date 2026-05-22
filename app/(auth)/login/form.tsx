"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Result } from "@/lib/types/result";

import { loginAction } from "./actions";

type State = Result | { initialError: string } | null;

export function LoginForm({ next, initialError }: { next?: string; initialError?: string }) {
  const t = useTranslations("login.form");
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
      toast.success(t("toastTitle"), {
        description: t("toastDescription"),
      });
      const params = new URLSearchParams({ email });
      if (next) params.set("next", next);
      router.push(`/auth/check-email?${params.toString()}`);
    }
  }, [state, email, next, router, t]);

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
        <Label htmlFor="email">{t("emailLabel")}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          autoFocus
          placeholder={t("emailPlaceholder")}
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
            <span className="sr-only">{t("submitting")}</span>
          </>
        ) : (
          t("submit")
        )}
      </Button>
    </form>
  );
}
