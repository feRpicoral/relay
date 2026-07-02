"use client";

import { Loader2, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Result } from "@/lib/types/result";
import { cn } from "@/lib/utils";

import { signupAction } from "./actions";

export function SignupForm() {
  const t = useTranslations("signup.form");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const router = useRouter();

  const [state, formAction, pending] = useActionState<Result | null, FormData>(
    async (_prev, formData) => signupAction(formData),
    null,
  );

  useEffect(() => {
    if (state?.ok) {
      toast.success(t("toastTitle"));
      router.push(`/auth/check-email?email=${encodeURIComponent(email)}`);
    }
  }, [state, email, router, t]);

  const error = state && !state.ok ? state.error : null;

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">{t("nameLabel")}</Label>
        <Input
          id="name"
          name="name"
          required
          autoComplete="name"
          autoFocus
          placeholder={t("namePlaceholder")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={pending}
          aria-invalid={error ? true : undefined}
          className={cn(error && "border-destructive focus-visible:ring-destructive")}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">{t("emailLabel")}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder={t("emailPlaceholder")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={pending}
          aria-invalid={error ? true : undefined}
          className={cn(error && "border-destructive focus-visible:ring-destructive")}
        />
      </div>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
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
      <p className="text-muted-foreground text-xs">{t("tos")}</p>
    </form>
  );
}
