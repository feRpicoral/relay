import { TrendingDown, TrendingUp } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

interface KpiTileProps {
  label: React.ReactNode;
  value: React.ReactNode;
  icon?: React.ReactNode;
  sub?: React.ReactNode;
  /** KPI values are monospaced by default to keep digits aligned. */
  mono?: boolean;
  className?: string;
}

export function KpiTile({ label, value, icon, sub, mono = true, className }: KpiTileProps) {
  return (
    <div
      className={cn("border-border bg-card flex flex-col gap-2 rounded-xl border p-4", className)}
    >
      <div className="text-muted-foreground flex items-center gap-1.5 text-[11px] font-semibold tracking-wide uppercase">
        {icon}
        {label}
      </div>
      <div className={cn("text-2xl leading-none font-semibold", mono && "font-mono")}>{value}</div>
      {sub != null ? <div className="text-muted-foreground text-xs">{sub}</div> : null}
    </div>
  );
}

interface TrendProps {
  /** Signed delta; the sign drives the arrow direction. */
  delta: number;
  suffix?: string;
  /** When true, a negative delta is the good outcome (e.g. handle time, latency). */
  invert?: boolean;
  className?: string;
}

export function Trend({ delta, suffix = "", invert = false, className }: TrendProps) {
  if (delta === 0) {
    return <span className={cn("text-muted-foreground font-medium", className)}>0{suffix}</span>;
  }
  const good = invert ? delta < 0 : delta > 0;
  const Icon = delta > 0 ? TrendingUp : TrendingDown;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-semibold",
        good ? "text-success" : "text-destructive",
        className,
      )}
    >
      <Icon className="size-3" />
      {delta > 0 ? "+" : ""}
      {delta}
      {suffix}
    </span>
  );
}
