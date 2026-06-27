import * as React from "react";

import { cn } from "@/lib/utils";

type BannerTone = "info" | "success" | "warning" | "destructive";

const toneClass: Record<BannerTone, string> = {
  info: "border-primary/30 bg-primary/10 [&_svg]:text-primary",
  success: "border-success/30 bg-success/10 [&_svg]:text-success",
  warning: "border-warning/40 bg-warning/15 [&_svg]:text-warning",
  destructive: "border-destructive/40 bg-destructive/10 [&_svg]:text-destructive",
};

interface BannerProps {
  tone?: BannerTone;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function Banner({ tone = "info", icon, children, className }: BannerProps) {
  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-2.5 rounded-lg border px-3.5 py-2.5 text-sm [&_svg]:mt-0.5 [&_svg]:size-4 [&_svg]:shrink-0",
        toneClass[tone],
        className,
      )}
    >
      {icon}
      <div className="min-w-0">{children}</div>
    </div>
  );
}
