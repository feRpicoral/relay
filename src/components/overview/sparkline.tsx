import { cn } from "@/lib/utils";

interface SparklineProps {
  values: number[];
  className?: string;
}

const VIEW_WIDTH = 320;
const VIEW_HEIGHT = 44;
const TOP_PADDING = 6;
const BOTTOM_PADDING = 6;

export function Sparkline({ values, className }: SparklineProps) {
  const gradientId = `sparkline-fill-${values.length}`;
  const points = toPoints(values);
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.y}`).join(" ");
  const area = `${line} L${VIEW_WIDTH} ${VIEW_HEIGHT} L0 ${VIEW_HEIGHT} Z`;

  return (
    <svg
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      preserveAspectRatio="none"
      className={cn("h-11 w-full", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--primary)" stopOpacity="0.25" />
          <stop offset="1" stopColor="var(--primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <path
        d={line}
        fill="none"
        stroke="var(--primary)"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function toPoints(values: number[]): { x: number; y: number }[] {
  if (values.length === 0) return [];
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const usableHeight = VIEW_HEIGHT - TOP_PADDING - BOTTOM_PADDING;
  const step = values.length === 1 ? 0 : VIEW_WIDTH / (values.length - 1);
  return values.map((v, i) => ({
    x: Number((step * i).toFixed(1)),
    y: Number((TOP_PADDING + usableHeight * (1 - (v - min) / span)).toFixed(1)),
  }));
}
