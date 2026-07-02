"use client";

import type { CampaignStatus } from "@prisma/client";
import { Loader2, Pause, Play, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { Result } from "@/lib/types/result";

import {
  cancelCampaignAction,
  pauseCampaignAction,
  resumeCampaignAction,
  startCampaignAction,
} from "./actions";

export function CampaignActions({
  campaignId,
  status,
}: {
  campaignId: string;
  status: CampaignStatus;
}) {
  const t = useTranslations("campaigns.detail");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function run(fn: () => Promise<Result>, successMessage: string) {
    return new Promise<void>((resolve) => {
      startTransition(async () => {
        const result = await fn();
        if (result.ok) {
          toast.success(successMessage);
          router.refresh();
        } else {
          toast.error(result.error);
        }
        resolve();
      });
    });
  }

  const canCancel = status === "DRAFT" || status === "RUNNING" || status === "PAUSED";

  return (
    <div className="flex items-center gap-2">
      {status === "RUNNING" ? (
        <Button
          variant="outline"
          disabled={pending}
          onClick={() => run(() => pauseCampaignAction({ campaignId }), t("toastPaused"))}
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Pause className="size-4" />}
          {t("pause")}
        </Button>
      ) : null}

      {status === "DRAFT" ? (
        <Button
          disabled={pending}
          onClick={() => run(() => startCampaignAction({ campaignId }), t("toastStarted"))}
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
          {t("start")}
        </Button>
      ) : null}

      {status === "PAUSED" ? (
        <Button
          disabled={pending}
          onClick={() => run(() => resumeCampaignAction({ campaignId }), t("toastResumed"))}
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
          {t("resume")}
        </Button>
      ) : null}

      {canCancel ? (
        <ConfirmDialog
          trigger={
            <Button variant="destructive" disabled={pending}>
              <X className="size-4" />
              {t("cancel")}
            </Button>
          }
          title={t("confirmCancel.title")}
          description={t("confirmCancel.description")}
          confirmLabel={t("confirmCancel.confirm")}
          cancelLabel={t("confirmCancel.keepRunning")}
          variant="destructive"
          pending={pending}
          onConfirm={() => run(() => cancelCampaignAction({ campaignId }), t("toastCanceled"))}
        />
      ) : null}
    </div>
  );
}
