"use client";

import { PhoneOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

import { hangupAction } from "./actions";

interface HangupButtonProps {
  callId: string;
  onEnded: () => void;
}

export function HangupButton({ callId, onEnded }: HangupButtonProps) {
  const t = useTranslations("calls.liveDetail.hangup");
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    return new Promise<void>((resolve) => {
      startTransition(async () => {
        const result = await hangupAction({ callId });
        if (result.ok) {
          toast.success(t("toastEnded"), { description: t("toastRecording") });
          onEnded();
        } else {
          toast.error(result.error);
        }
        resolve();
      });
    });
  }

  return (
    <ConfirmDialog
      trigger={
        <Button variant="destructive" size="sm">
          <PhoneOff className="h-4 w-4" />
          {t("button")}
        </Button>
      }
      title={t("confirmTitle")}
      description={t("confirmDescription")}
      confirmLabel={t("endCall")}
      cancelLabel={t("keepMonitoring")}
      variant="destructive"
      onConfirm={handleConfirm}
      pending={pending}
    />
  );
}
