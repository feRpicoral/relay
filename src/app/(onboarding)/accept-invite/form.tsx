"use client";

import { CircleCheck, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { Result } from "@/lib/types/result";

import { acceptInviteAction } from "./actions";

export function AcceptInviteForm({ token }: { token: string }) {
  const t = useTranslations("onboarding.acceptInvite.form");
  const router = useRouter();

  const [state, runAccept, pending] = useActionState<Result | null>(
    async () => acceptInviteAction(token),
    null,
  );

  useEffect(() => {
    if (state?.ok) {
      toast.success(t("toastWelcome"));
      router.push("/overview");
      router.refresh();
    }
  }, [state, router, t]);

  const error = state && !state.ok ? state.error : null;

  return (
    <div className="mt-5 space-y-3">
      <form
        action={() => {
          runAccept();
        }}
      >
        <Button type="submit" className="w-full gap-2" disabled={pending}>
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              <CircleCheck className="size-4" />
              {t("submit")}
            </>
          )}
        </Button>
      </form>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </div>
  );
}
