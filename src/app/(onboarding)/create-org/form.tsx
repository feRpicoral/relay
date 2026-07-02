"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Result } from "@/lib/types/result";

import { createOrgAction } from "./actions";

type State = Result<{ orgId: string }> | null;

export function CreateOrgForm() {
  const t = useTranslations("onboarding.createOrg.form");
  const router = useRouter();

  const [state, formAction, pending] = useActionState<State, FormData>(
    async (_prev, formData) => createOrgAction(formData),
    null,
  );

  useEffect(() => {
    if (state && state.ok) {
      toast.success(t("toastCreated"));
      router.push("/overview");
    }
  }, [state, router, t]);

  const error = state && !state.ok ? state.error : null;

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">{t("nameLabel")}</Label>
        <Input
          id="name"
          name="name"
          placeholder={t("namePlaceholder")}
          autoFocus
          required
          disabled={pending}
        />
      </div>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("submit")}
      </Button>
    </form>
  );
}
