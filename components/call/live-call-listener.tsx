"use client";

import { useEffect, useState } from "react";

import { Waveform } from "@/components/call/waveform";

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

/**
 * Joins a LiveKit room as a passive listener (no publish) to render the live
 * waveform. If LiveKit isn't configured (token/url missing), renders a
 * synthetic animated waveform so the screen still looks alive.
 *
 * Critical: every per-mount resource (room, audio context, graph nodes) lives
 * in closure variables inside the effect — NOT in refs. React Strict Mode
 * double-invokes effects in dev, and shared refs would cause cleanup-1 to
 * teardown room-2 mid-connect. The setup is also delayed by one tick so the
 * StrictMode cleanup flips `cancelled` before any LiveKit work starts; only
 * the surviving mount actually negotiates.
 */
export function LiveCallListener({ livekitUrl, roomName, token, active }: LiveCallListenerProps) {
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  useEffect(() => {
    if (!livekitUrl || !roomName || !token || !active) return;

    let cancelled = false;
    let room: { disconnect: () => Promise<void> } | null = null;
    let audioCtx: AudioContext | null = null;
    const sources: MediaStreamAudioSourceNode[] = [];

    const setupTimer = setTimeout(() => {
      void runSetup();
    }, 100);

    async function runSetup() {
      if (cancelled) return;
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
        return;
      }
      if (cancelled) {
        await r.disconnect().catch(() => undefined);
        return;
      }

      // Catch tracks already published when we connected.
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

      if (!cancelled) setAnalyser(localAnalyser);
    }

    return () => {
      cancelled = true;
      clearTimeout(setupTimer);
      // Disconnect each graph node explicitly. Closing the AudioContext alone
      // doesn't synchronously detach upstream MediaStreamSources, leaving a
      // window where the analyser still feeds the synthetic waveform path.
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
  }, [livekitUrl, roomName, token, active]);

  return <Waveform analyser={analyser} active={active} className="h-32 w-full" />;
}
