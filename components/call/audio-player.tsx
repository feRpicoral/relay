"use client";

import { Pause, Play } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

const MS_PER_SECOND = 1000;
const PERCENT_DIVISOR = 100;

interface AudioPlayerProps {
  src: string | null;
  className?: string;
  onTimeUpdate?: (currentMs: number) => void;
}

export function AudioPlayer({ src, className, onTimeUpdate }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentMs, setCurrentMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
    } else {
      // Surface autoplay-policy failures by reverting the playing state.
      a.play().catch(() => setPlaying(false));
    }
  }

  function seek(percent: number) {
    const a = audioRef.current;
    if (!a || !durationMs) return;
    a.currentTime = (percent / PERCENT_DIVISOR) * (durationMs / MS_PER_SECOND);
  }

  if (!src) {
    return (
      <div
        className={cn(
          "border-border bg-card/40 text-muted-foreground flex items-center justify-center rounded-md border border-dashed px-4 py-6 text-sm",
          className,
        )}
      >
        Sem gravação disponível.
      </div>
    );
  }

  return (
    <div
      className={cn(
        "border-border bg-card/40 flex items-center gap-3 rounded-md border px-3 py-2",
        className,
      )}
    >
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onLoadedMetadata={(e) => {
          // Streamed audio without a known length reports Infinity here, which
          // would poison every percent math downstream.
          const d = e.currentTarget.duration;
          setDurationMs(Number.isFinite(d) ? d * MS_PER_SECOND : 0);
        }}
        onTimeUpdate={(e) => {
          const ms = e.currentTarget.currentTime * MS_PER_SECOND;
          setCurrentMs(ms);
          // Fire the callback synchronously from the DOM event instead of
          // bouncing through a useEffect: the effect-as-callback pattern fires
          // on every parent re-render and creates an extra render cycle per
          // tick.
          onTimeUpdate?.(ms);
        }}
      />
      <Button type="button" variant="secondary" size="icon-sm" onClick={toggle}>
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </Button>
      <span className="text-muted-foreground font-mono text-xs">{formatTime(currentMs)}</span>
      <Slider
        value={[durationMs ? (currentMs / durationMs) * PERCENT_DIVISOR : 0]}
        onValueChange={([v]) => seek(v ?? 0)}
        className="flex-1"
        max={PERCENT_DIVISOR}
      />
      <span className="text-muted-foreground font-mono text-xs">{formatTime(durationMs)}</span>
    </div>
  );
}

function formatTime(ms: number): string {
  const s = Math.floor(ms / MS_PER_SECOND);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}
