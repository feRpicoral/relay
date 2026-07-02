"use client";

import { Pause, Play, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useRef, useState } from "react";

import { cn, formatTimestamp } from "@/lib/utils";

const MS_PER_SECOND = 1000;
const BAR_COUNT = 46;
const MIN_BAR = 0.28;

interface AudioPlayerProps {
  src: string | null;
  className?: string;
  onTimeUpdate?: (currentMs: number) => void;
}

/**
 * Deterministic bar heights seeded by the recording URL. Real peak data isn't
 * stored, so the scrubber renders a stable pseudo-waveform per recording.
 */
function useWaveform(src: string | null): number[] {
  return useMemo(() => {
    let seed = 0;
    for (let i = 0; i < (src?.length ?? 0); i += 1) {
      seed = (seed * 31 + src!.charCodeAt(i)) >>> 0;
    }
    const bars: number[] = [];
    for (let i = 0; i < BAR_COUNT; i += 1) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      const n = (seed >> 8) / 0x7fffff;
      bars.push(MIN_BAR + n * (1 - MIN_BAR));
    }
    return bars;
  }, [src]);
}

export function AudioPlayer({ src, className, onTimeUpdate }: AudioPlayerProps) {
  const t = useTranslations("calls.detail.recording");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentMs, setCurrentMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const bars = useWaveform(src);

  if (!src) {
    return (
      <div
        className={cn(
          "border-border bg-card/40 flex items-center gap-3 rounded-md border px-4 py-3",
          className,
        )}
      >
        <span className="text-muted-foreground border-border flex size-9 items-center justify-center rounded-full border">
          <Play className="size-4" />
        </span>
        <div>
          <p className="text-foreground text-sm font-semibold">{t("none")}</p>
          <p className="text-muted-foreground text-xs">{t("noneDescription")}</p>
        </div>
      </div>
    );
  }

  const hasDuration = durationMs > 0;
  const progress = hasDuration ? currentMs / durationMs : 0;

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      return;
    }
    a.play()
      .then(() => setAutoplayBlocked(false))
      .catch(() => {
        setPlaying(false);
        setAutoplayBlocked(true);
      });
  }

  function seekToFraction(fraction: number) {
    const a = audioRef.current;
    if (!a || !hasDuration) return;
    a.currentTime = Math.max(0, Math.min(1, fraction)) * (durationMs / MS_PER_SECOND);
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          setDurationMs(Number.isFinite(d) ? d * MS_PER_SECOND : 0);
        }}
        onTimeUpdate={(e) => {
          const ms = e.currentTarget.currentTime * MS_PER_SECOND;
          setCurrentMs(ms);
          onTimeUpdate?.(ms);
        }}
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? t("pause") : t("play")}
          className="bg-secondary text-secondary-foreground hover:bg-secondary/80 flex size-9 shrink-0 items-center justify-center rounded-full transition-colors"
        >
          {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
        </button>
        <button
          type="button"
          aria-label={t("play")}
          className={cn(
            "flex h-8 flex-1 items-end gap-[2px]",
            !hasDuration && "cursor-default opacity-70",
          )}
          onClick={(e) => {
            if (!hasDuration) return;
            const rect = e.currentTarget.getBoundingClientRect();
            seekToFraction((e.clientX - rect.left) / rect.width);
          }}
        >
          {bars.map((h, i) => {
            const filled = hasDuration && i / bars.length <= progress;
            return (
              <span
                key={i}
                className={cn(
                  "flex-1 rounded-full",
                  filled ? "bg-primary" : "bg-muted-foreground/30",
                )}
                style={{ height: `${Math.round(h * 100)}%` }}
              />
            );
          })}
        </button>
      </div>
      <div className="text-muted-foreground flex items-center justify-between font-mono text-xs">
        <span className="text-foreground">{formatTimestamp(currentMs)}</span>
        <span>{hasDuration ? formatTimestamp(durationMs) : t("unknownDuration")}</span>
      </div>
      {autoplayBlocked ? (
        <p className="text-warning flex items-center gap-1.5 text-xs">
          <TriangleAlert className="size-3.5" />
          {t("autoplayBlocked")}
        </p>
      ) : !hasDuration ? (
        <p className="text-muted-foreground text-xs">{t("streaming")}</p>
      ) : null}
    </div>
  );
}
