"use client";

import { useEffect, useRef } from "react";

/**
 * Animated waveform. Two modes:
 *
 *  - **Live**: when an `AnalyserNode` is passed, samples frequency data each
 *    frame and renders bars proportional to amplitude.
 *  - **Synthesized**: when no analyser is passed (e.g. live page rendered
 *    before the audio track arrives), runs a smooth synthetic pattern so the
 *    UI still feels alive.
 */
interface WaveformProps {
  analyser?: AnalyserNode | null;
  active: boolean;
  className?: string;
  barCount?: number;
}

// Visual tuning constants — collected here so the synthetic pattern is easy to
// reason about and easy to compare against the live-frequency path.
const SYNTHETIC_TIME_STEP = 0.04;
const SYNTHETIC_PHASE_STEP = 0.18;
const SYNTHETIC_AMP_SCALE = 2.4;
const SYNTHETIC_AMP_FLOOR = 0.08;
const INACTIVE_AMP = 0.06;
const ACTIVE_ALPHA = 0.85;
const INACTIVE_ALPHA = 0.35;
const BAR_HEIGHT_RATIO = 0.85;
const FREQ_USABLE_RATIO = 0.6;

export function Waveform({ analyser, active, className, barCount = 48 }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const tRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    function resize() {
      if (!canvas || !ctx) return;
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      // Replace the transform outright. Re-using `ctx.scale(dpr,dpr)` compounds
      // across ResizeObserver fires; setTransform resets first.
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // Cache the theme token once; resolving CSS variables is layout-flushing
    // and we hit it 60×/sec from inside the draw loop otherwise.
    const computed = getComputedStyle(canvas);
    const color = computed.getPropertyValue("--wf-color").trim() || "currentColor";

    // Allocate the frequency buffer once per analyser instance.
    const dataBuf = analyser ? new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount)) : null;

    function draw() {
      if (!canvas || !ctx) return;
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);

      const width = rect.width;
      const height = rect.height;
      const barWidth = width / barCount;
      const center = height / 2;

      // Read frequency data ONCE per frame, not per bar.
      let freq: Uint8Array<ArrayBuffer> | null = null;
      if (analyser && dataBuf) {
        analyser.getByteFrequencyData(dataBuf);
        freq = dataBuf;
      }

      tRef.current += SYNTHETIC_TIME_STEP;

      for (let i = 0; i < barCount; i += 1) {
        let amp: number;
        if (freq) {
          const idx = Math.floor((i / barCount) * (freq.length * FREQ_USABLE_RATIO));
          amp = (freq[idx] ?? 0) / 255;
        } else if (active) {
          const phase = tRef.current + i * SYNTHETIC_PHASE_STEP;
          amp =
            (Math.sin(phase) * Math.sin(phase * 0.5) + 1) / SYNTHETIC_AMP_SCALE +
            SYNTHETIC_AMP_FLOOR;
        } else {
          amp = INACTIVE_AMP;
        }

        const h = Math.max(2, amp * (height * BAR_HEIGHT_RATIO));
        const x = i * barWidth + barWidth * 0.2;
        const w = barWidth * 0.6;

        ctx.fillStyle = color;
        ctx.globalAlpha = active ? ACTIVE_ALPHA : INACTIVE_ALPHA;
        ctx.fillRect(x, center - h / 2, w, h);
      }

      rafRef.current = requestAnimationFrame(draw);
    }
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [analyser, active, barCount]);

  return (
    <canvas
      ref={canvasRef}
      className={className ?? "h-24 w-full"}
      style={{ ["--wf-color" as string]: "var(--primary)" }}
    />
  );
}
