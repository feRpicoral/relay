"use client";

import { Minus, Plus } from "lucide-react";

import { cn } from "@/lib/utils";

interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** When set, a hidden input mirrors the value so the stepper works in a form post. */
  name?: string;
  id?: string;
  "aria-label"?: string;
  className?: string;
}

export function Stepper({
  value,
  onChange,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  step = 1,
  name,
  id,
  "aria-label": ariaLabel,
  className,
}: StepperProps) {
  const clamp = (next: number) => Math.min(max, Math.max(min, next));

  return (
    <div
      className={cn(
        "border-input bg-card flex h-9 items-stretch overflow-hidden rounded-md border",
        className,
      )}
    >
      <button
        type="button"
        aria-label="decrement"
        disabled={value <= min}
        onClick={() => onChange(clamp(value - step))}
        className="text-muted-foreground hover:text-foreground border-border flex w-9 items-center justify-center border-r disabled:opacity-40"
      >
        <Minus className="size-4" />
      </button>
      <input
        id={id}
        name={name}
        type="number"
        inputMode="numeric"
        aria-label={ariaLabel}
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const parsed = Number.parseInt(e.target.value, 10);
          if (!Number.isNaN(parsed)) onChange(clamp(parsed));
        }}
        className="w-full min-w-0 [appearance:textfield] bg-transparent text-center font-mono text-sm font-semibold outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button
        type="button"
        aria-label="increment"
        disabled={value >= max}
        onClick={() => onChange(clamp(value + step))}
        className="text-muted-foreground hover:text-foreground border-border flex w-9 items-center justify-center border-l disabled:opacity-40"
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}
