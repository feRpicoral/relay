"use client";

import { Loader2, RotateCw, WifiOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { Waveform } from "@/components/call/waveform";
import { Button } from "@/components/ui/button";
import { Dot } from "@/components/ui/dot";
import { cn } from "@/lib/utils";

interface LiveCallListenerProps {
  livekitUrl: string | null;
  roomName: string | null;
  token: string | null;
  active: boolean;
}

interface AttachableTrack {
  kind: string;
  mediaStreamTrack: MediaStreamTrack;
}

type ListenState = "connecting" | "connected" | "failed" | "idle";

export function LiveCallListener({ livekitUrl, roomName, token, active }: LiveCallListenerProps) {
  const t = useTranslations("calls.liveDetail.listen");
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  // Track only the connection outcome; the displayed state is derived so the
  // effect never has to setState synchronously on a dependency change.
  const [connResult, setConnResult] = useState<"connected" | "failed" | null>(null);
  // Bumping this re-runs the connection effect for a manual retry.
  const [attempt, setAttempt] = useState(0);

  const canConnect = Boolean(livekitUrl && roomName && token && active);

  const state: ListenState = !canConnect
    ? active
      ? "connecting"
      : "idle"
    : (connResult ?? "connecting");

  useEffect(() => {
    if (!canConnect) return;

    let cancelled = false;
    let room: { disconnect: () => Promise<void> } | null = null;
    let audioCtx: AudioContext | null = null;
    const sources: MediaStreamAudioSourceNode[] = [];

    const setupTimer = setTimeout(() => {
      void runSetup();
    }, 100);

    async function runSetup() {
      if (cancelled) return;
      setConnResult(null);
      setAnalyser(null);
      const url = livekitUrl;
      const tk = token;
      if (!url || !tk) return;
      const { Room, RoomEvent, Track } = await import("livekit-client");
      if (cancelled) return;

      const r = new Room();
      room = r;
      audioCtx = new AudioContext();
      const localAnalyser = audioCtx.createAnalyser();
      localAnalyser.fftSize = 512;

      function onTrack(track: AttachableTrack) {
        if (cancelled || !audioCtx) return;
        if (track.kind !== Track.Kind.Audio) return;
        const stream = new MediaStream([track.mediaStreamTrack]);
        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(localAnalyser);
        sources.push(source);
      }

      r.on(RoomEvent.TrackSubscribed, (track: AttachableTrack) => onTrack(track));

      try {
        await r.connect(url, tk);
      } catch (err) {
        console.warn("[live-call-listener] connect failed", err);
        if (!cancelled) setConnResult("failed");
        return;
      }
      if (cancelled) {
        await r.disconnect().catch(() => undefined);
        return;
      }

      (
        r as unknown as {
          remoteParticipants: Map<
            string,
            { audioTrackPublications: Map<string, { track?: AttachableTrack }> }
          >;
        }
      ).remoteParticipants.forEach((p) => {
        p.audioTrackPublications.forEach((pub) => {
          if (pub.track) onTrack(pub.track);
        });
      });

      if (!cancelled) {
        setAnalyser(localAnalyser);
        setConnResult("connected");
      }
    }

    return () => {
      cancelled = true;
      clearTimeout(setupTimer);
      for (const s of sources) {
        try {
          s.disconnect();
        } catch {
          // already detached
        }
      }
      if (room) {
        void room.disconnect().catch(() => undefined);
      }
      if (audioCtx) {
        void audioCtx.close().catch(() => undefined);
      }
    };
  }, [livekitUrl, roomName, token, active, canConnect, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return <LiveAudioCard state={state} analyser={analyser} active={active} onRetry={retry} t={t} />;
}

interface LiveAudioCardProps {
  state: ListenState;
  analyser: AnalyserNode | null;
  active: boolean;
  onRetry: () => void;
  t: ReturnType<typeof useTranslations>;
}

export function LiveAudioCard({ state, analyser, active, onRetry, t }: LiveAudioCardProps) {
  const header =
    state === "failed"
      ? { tone: "destructive" as const, label: t("failedTitle"), meta: t("failedMeta") }
      : state === "connecting"
        ? { tone: "warning" as const, label: t("connecting"), meta: t("negotiating") }
        : { tone: "success" as const, label: t("listeningIn"), meta: t("codec") };

  return (
    <div className="bg-card overflow-hidden rounded-xl border">
      <div className="flex items-center justify-between gap-2 px-4 pt-3 pb-2">
        <div className="flex min-w-0 items-center gap-2">
          <Dot tone={header.tone} pulse={state === "connected"} />
          <span className="truncate text-sm font-semibold">{header.label}</span>
        </div>
        <span className="text-muted-foreground font-mono text-[11px] whitespace-nowrap">
          {header.meta}
        </span>
      </div>

      <div className="relative mx-3 h-24">
        {state === "connecting" ? (
          <div className="text-muted-foreground absolute inset-0 z-10 flex items-center justify-center gap-2 text-xs">
            <Loader2 className="size-4 animate-spin" />
            {t("connectingTranscript")}
          </div>
        ) : null}
        {state === "failed" ? (
          <div className="text-destructive absolute inset-0 z-10 flex flex-col items-center justify-center gap-1.5">
            <WifiOff className="size-6" />
            <span className="text-xs font-medium">{t("failedHint")}</span>
          </div>
        ) : (
          <Waveform
            analyser={analyser}
            active={state === "connected" && active}
            className={cn("h-24 w-full", state === "connecting" && "opacity-30")}
          />
        )}
      </div>

      <div className="flex items-center justify-between gap-3 px-4 pt-2 pb-3">
        <span className="text-muted-foreground min-w-0 truncate text-xs">
          {state === "failed"
            ? t("failedTranscriptNote")
            : state === "connecting"
              ? t("establishing")
              : t("youAreListening")}
        </span>
        {state === "failed" ? (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RotateCw className="size-3.5" />
            {t("retry")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
