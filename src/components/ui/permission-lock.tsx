"use client";

import { Lock } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface PermissionLockProps {
  /** Tooltip text explaining why the action is restricted (e.g. "Admins only"). */
  label: string;
  className?: string;
}

/** Lock affordance shown next to admin-only items that members see but can't use. */
export function PermissionLock({ label, className }: PermissionLockProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn("text-muted-foreground inline-flex items-center", className)}
          aria-label={label}
        >
          <Lock className="size-3.5" />
        </span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
