import { ArrowDownLeft, ArrowUpRight } from "lucide-react";

import { cn } from "@/lib/utils";

export function DirectionIcon({
  direction,
  label,
  className,
}: {
  direction: "INBOUND" | "OUTBOUND";
  label: string;
  className?: string;
}) {
  const Icon = direction === "INBOUND" ? ArrowDownLeft : ArrowUpRight;
  return (
    <span className={cn("text-muted-foreground flex shrink-0", className)} title={label}>
      <Icon className="size-3.5" aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function DirectionChip({
  direction,
  label,
  className,
}: {
  direction: "INBOUND" | "OUTBOUND";
  label: string;
  className?: string;
}) {
  const Icon = direction === "INBOUND" ? ArrowDownLeft : ArrowUpRight;
  return (
    <span
      className={cn(
        "border-border bg-card/40 text-muted-foreground inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10.5px] font-semibold tracking-wide uppercase",
        className,
      )}
    >
      <Icon className="size-3" aria-hidden />
      {label}
    </span>
  );
}
