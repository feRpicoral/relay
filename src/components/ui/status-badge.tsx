import { Dot } from "@/components/ui/dot";
import type { StatusTone } from "@/lib/status-tone";
import { cn } from "@/lib/utils";

const toneClass: Record<StatusTone, string> = {
  primary: "border-primary/30 bg-primary/10 text-foreground",
  success: "border-success/30 bg-success/10 text-foreground",
  warning: "border-warning/40 bg-warning/15 text-foreground",
  destructive: "border-destructive/30 bg-destructive/10 text-foreground",
  muted: "border-border bg-muted text-muted-foreground",
};

interface StatusBadgeProps {
  label: string;
  tone?: StatusTone;
  pulse?: boolean;
  className?: string;
}

/**
 * Soft, tinted status pill with a leading status dot. The domain-enum → tone
 * mapping lives in `lib/status-tone`; pass the resolved tone + localized label.
 */
export function StatusBadge({ label, tone = "muted", pulse = false, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium",
        toneClass[tone],
        className,
      )}
    >
      <Dot tone={tone} pulse={pulse} />
      {label}
    </span>
  );
}
