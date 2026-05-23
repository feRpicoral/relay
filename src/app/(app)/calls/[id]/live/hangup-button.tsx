"use client";

import { PhoneOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { hangupAction } from "./actions";

export function HangupButton({ callId }: { callId: string }) {
  const t = useTranslations("calls.liveDetail.hangup");
  const [pending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      const result = await hangupAction({ callId });
      if (result.ok) {
        toast.success(t("toastEnded"));
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Button variant="destructive" size="sm" onClick={onClick} disabled={pending}>
      <PhoneOff className="h-4 w-4" />
      {t("button")}
    </Button>
  );
}
