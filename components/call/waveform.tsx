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
      ctx.scale(dpr, dpr);
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const data = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;

    function draw() {
      if (!canvas || !ctx) return;
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);

      const width = rect.width;
      const height = rect.height;
      const barWidth = width / barCount;
      const center = height / 2;

      const computed = getComputedStyle(canvas);
      const color = computed.getPropertyValue("--wf-color").trim() || "#7c5cff";

      tRef.current += 0.04;

      for (let i = 0; i < barCount; i += 1) {
        let amp: number;
        if (analyser && data) {
          analyser.getByteFrequencyData(data);
          const idx = Math.floor((i / barCount) * (data.length * 0.6));
          amp = (data[idx] ?? 0) / 255;
        } else if (active) {
          // Synthetic pattern — pleasing pulse instead of a flat line.
          const phase = tRef.current + i * 0.18;
          amp = (Math.sin(phase) * Math.sin(phase * 0.5) + 1) / 2.4 + 0.08;
        } else {
          amp = 0.06;
        }

        const h = Math.max(2, amp * (height * 0.85));
        const x = i * barWidth + barWidth * 0.2;
        const w = barWidth * 0.6;

        ctx.fillStyle = color;
        ctx.globalAlpha = active ? 0.85 : 0.35;
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
