"use client";

import { AlertTriangle, Loader2, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Result } from "@/lib/types/result";
import { cn } from "@/lib/utils";

import { loginAction } from "./actions";

export function LoginForm({ next, linkError }: { next?: string; linkError?: string }) {
  const t = useTranslations("login.form");
  const [email, setEmail] = useState("");
  const router = useRouter();

  const [state, formAction, pending] = useActionState<Result | null, FormData>(
    async (_prev, formData) => loginAction(formData),
    null,
  );

  useEffect(() => {
    if (state?.ok) {
      toast.success(t("toastTitle"), { description: t("toastDescription") });
      const params = new URLSearchParams({ email });
      if (next) params.set("next", next);
      router.push(`/auth/check-email?${params.toString()}`);
    }
  }, [state, email, next, router, t]);

  const fieldError = state && !state.ok ? state.error : null;

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      {linkError ? (
        <Banner tone="destructive" icon={<AlertTriangle />}>
          {linkError}
        </Banner>
      ) : null}
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
          aria-invalid={fieldError ? true : undefined}
          className={cn(fieldError && "border-destructive focus-visible:ring-destructive")}
        />
      </div>
      {fieldError ? <p className="text-destructive text-sm">{fieldError}</p> : null}
      <Button type="submit" className="w-full gap-2" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            <span className="sr-only">{t("submitting")}</span>
          </>
        ) : (
          <>
            <Mail className="size-4" />
            {t("submit")}
          </>
        )}
      </Button>
    </form>
  );
}
