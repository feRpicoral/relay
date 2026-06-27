import * as React from "react";

import { cn } from "@/lib/utils";

interface KvRowProps {
  label: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  valueClassName?: string;
}

/** Read-only key/value row used by Organization identity and the Twilio panel. */
export function KvRow({ label, children, className, valueClassName }: KvRowProps) {
  return (
    <div
      className={cn(
        "border-border/60 flex items-center justify-between gap-4 border-b py-3 last:border-b-0",
        className,
      )}
    >
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className={cn("text-foreground flex items-center gap-1.5 text-sm", valueClassName)}>
        {children}
      </span>
    </div>
  );
}
