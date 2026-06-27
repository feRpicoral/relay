"use client";

import { Check, Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const COPIED_RESET_MS = 1500;

interface CopyButtonProps {
  value: string;
  className?: string;
}

export function CopyButton({ value, className }: CopyButtonProps) {
  const t = useTranslations("settings.common");
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), COPIED_RESET_MS);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={copy}
          aria-label={copied ? t("copied") : t("copy")}
          className={cn(
            "text-muted-foreground hover:text-foreground inline-flex size-6 items-center justify-center rounded-md transition-colors [&_svg]:size-3.5",
            className,
          )}
        >
          {copied ? <Check className="text-success" /> : <Copy />}
        </button>
      </TooltipTrigger>
      <TooltipContent>{copied ? t("copied") : t("copy")}</TooltipContent>
    </Tooltip>
  );
}
