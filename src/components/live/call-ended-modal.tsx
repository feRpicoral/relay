"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Dialog, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";

/**
 * Post-hangup confirmation shown while the call's summary/outcome/sentiment are
 * generated server-side. Non-dismissable — the parent redirects to the call
 * detail once processing kicks off.
 */
export function CallEndedModal({ open }: { open: boolean }) {
  const t = useTranslations("calls.liveDetail.hangup");
  return (
    <Dialog open={open}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          className="border-border bg-card data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 fixed top-1/2 left-1/2 z-50 grid w-full max-w-sm -translate-x-1/2 -translate-y-1/2 gap-4 border p-6 text-center shadow-2xl duration-200 sm:rounded-xl"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <div className="bg-success/10 text-success border-success/30 mx-auto flex size-12 items-center justify-center rounded-xl border">
            <CheckCircle2 className="size-6" />
          </div>
          <DialogTitle className="text-center">{t("endedTitle")}</DialogTitle>
          <p className="text-muted-foreground text-sm">{t("endedDescription")}</p>
          <div className="text-muted-foreground flex items-center justify-center gap-2 text-xs">
            <Loader2 className="size-3.5 animate-spin" />
            {t("redirecting")}
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
