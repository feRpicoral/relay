"use client";

import { Loader2 } from "lucide-react";
import { type ReactNode, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ConfirmDialogProps {
  /** Element that opens the dialog (rendered as `DialogTrigger asChild`). */
  trigger: ReactNode;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Use `destructive` for delete/remove flows. */
  variant?: "destructive" | "default";
  /** Called when the user confirms. Awaited; the dialog closes on resolve. */
  onConfirm: () => Promise<void> | void;
  /** Disables the confirm button while a parent transition is pending. */
  pending?: boolean;
}

/**
 * Shared confirmation dialog for destructive actions. Replaces ad-hoc
 * `window.confirm` calls and the single-click-and-gone pattern.
 */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "destructive",
  onConfirm,
  pending = false,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function handleConfirm() {
    setConfirming(true);
    try {
      await onConfirm();
      setOpen(false);
    } finally {
      setConfirming(false);
    }
  }

  const busy = pending || confirming;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button variant={variant} onClick={handleConfirm} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
