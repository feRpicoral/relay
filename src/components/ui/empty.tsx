import * as React from "react";

import { cn } from "@/lib/utils";

interface EmptyProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function Empty({ icon, title, description, action, className }: EmptyProps) {
  return (
    <div
      className={cn(
        "border-border bg-card/40 flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed px-6 py-12 text-center",
        className,
      )}
    >
      {icon ? (
        <div className="bg-muted text-muted-foreground mb-4 flex h-12 w-12 items-center justify-center rounded-full">
          {icon}
        </div>
      ) : null}
      <h3 className="text-sm font-semibold">{title}</h3>
      {description ? (
        <p className="text-muted-foreground mt-1 max-w-sm text-sm">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
