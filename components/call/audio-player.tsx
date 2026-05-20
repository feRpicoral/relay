"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

export interface AudioPlayerHandle {
  seek: (ms: number) => void;
  play: () => void;
  pause: () => void;
}

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

  useEffect(() => {
    onTimeUpdate?.(currentMs);
  }, [currentMs, onTimeUpdate]);

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
    } else {
      a.play().catch(() => undefined);
    }
  }

  function seek(percent: number) {
    const a = audioRef.current;
    if (!a || !durationMs) return;
    a.currentTime = (percent / 100) * (durationMs / 1000);
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
        onLoadedMetadata={(e) => setDurationMs(e.currentTarget.duration * 1000)}
        onTimeUpdate={(e) => setCurrentMs(e.currentTarget.currentTime * 1000)}
      />
      <Button type="button" variant="secondary" size="icon-sm" onClick={toggle}>
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </Button>
      <span className="text-muted-foreground font-mono text-xs">{formatTime(currentMs)}</span>
      <Slider
        value={[durationMs ? (currentMs / durationMs) * 100 : 0]}
        onValueChange={([v]) => seek(v ?? 0)}
        className="flex-1"
        max={100}
      />
      <span className="text-muted-foreground font-mono text-xs">{formatTime(durationMs)}</span>
    </div>
  );
}

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}
