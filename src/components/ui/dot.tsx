import type { StatusTone } from "@/lib/status-tone";
import { cn } from "@/lib/utils";

const toneBg: Record<StatusTone, string> = {
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
  muted: "bg-muted-foreground",
};

interface DotProps {
  tone?: StatusTone;
  pulse?: boolean;
  className?: string;
}

export function Dot({ tone = "muted", pulse = false, className }: DotProps) {
  if (!pulse) {
    return (
      <span className={cn("inline-block size-2 shrink-0 rounded-full", toneBg[tone], className)} />
    );
  }
  return (
    <span className={cn("relative inline-flex size-2 shrink-0", className)}>
      <span
        className={cn(
          "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
          toneBg[tone],
        )}
      />
      <span className={cn("relative inline-flex size-2 rounded-full", toneBg[tone])} />
    </span>
  );
}
