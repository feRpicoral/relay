import { cn } from "@/lib/utils";

const BAR_HEIGHTS = [10, 12, 15, 22, 20, 18, 14, 14, 11];
const BASE_DURATION_MS = 540;
const DURATION_STEP_MS = 60;
const DELAY_STEP_MS = 45;

interface MiniWaveformProps {
  /** Tint the bars destructive to flag an over-budget latency leg. */
  overBudget?: boolean;
  className?: string;
}

/**
 * Compact CSS-animated waveform for live list rows. Decorative only — the bars
 * run a synthetic pattern; there is no audio source on the list view.
 */
export function MiniWaveform({ overBudget = false, className }: MiniWaveformProps) {
  return (
    <div aria-hidden className={cn("flex h-6 items-center gap-[3px]", className)}>
      {BAR_HEIGHTS.map((height, i) => (
        <span
          key={i}
          className={cn(
            "w-[3px] origin-center rounded-full motion-reduce:animate-none",
            overBudget ? "bg-destructive/70" : "bg-primary/70",
          )}
          style={{
            height,
            animation: "var(--animate-wave)",
            ["--wave-duration" as string]: `${BASE_DURATION_MS + i * DURATION_STEP_MS}ms`,
            ["--wave-delay" as string]: `${i * DELAY_STEP_MS}ms`,
          }}
        />
      ))}
    </div>
  );
}
