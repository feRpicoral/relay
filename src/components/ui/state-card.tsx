import * as React from "react";

import { cn } from "@/lib/utils";

type StateTone = "muted" | "primary" | "success" | "warning" | "destructive";

const iconToneClass: Record<StateTone, string> = {
  muted: "bg-secondary text-muted-foreground",
  primary: "bg-primary/10 text-primary border border-primary/30",
  success: "bg-success/10 text-success border border-success/30",
  warning: "bg-warning/15 text-warning border border-warning/40",
  destructive: "bg-destructive/10 text-destructive border border-destructive/30",
};

interface StateCardProps {
  icon?: React.ReactNode;
  iconTone?: StateTone;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  /** Dashed container for in-flow empty states; omit for centered error/404 states. */
  bordered?: boolean;
  className?: string;
}

/**
 * Centered icon + title + description + actions. Covers error, not-found,
 * admins-only, and rich empty states across the app.
 */
export function StateCard({
  icon,
  iconTone = "muted",
  title,
  description,
  actions,
  bordered = false,
  className,
}: StateCardProps) {
  return (
    <div
      className={cn(
        "mx-auto flex max-w-sm flex-col items-center px-6 py-10 text-center",
        bordered && "border-border bg-card/40 w-full rounded-xl border border-dashed",
        className,
      )}
    >
      {icon ? (
        <div
          className={cn(
            "mb-4 flex size-13 items-center justify-center rounded-[13px] [&_svg]:size-6",
            iconToneClass[iconTone],
          )}
        >
          {icon}
        </div>
      ) : null}
      <h3 className="text-base font-semibold">{title}</h3>
      {description ? (
        <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">{description}</p>
      ) : null}
      {actions ? (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
