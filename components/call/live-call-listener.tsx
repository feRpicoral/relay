"use client";

import { useEffect, useRef, useState } from "react";

import { Waveform } from "@/components/call/waveform";

interface LiveCallListenerProps {
  livekitUrl: string | null;
  roomName: string | null;
  token: string | null;
  active: boolean;
}

/**
 * Joins a LiveKit room as a passive listener (no publish) to render the live
 * waveform. If LiveKit isn't configured (token/url missing), renders a synthetic
 * animated waveform so the screen still looks alive.
 */
export function LiveCallListener({ livekitUrl, roomName, token, active }: LiveCallListenerProps) {
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const roomRef = useRef<unknown | null>(null);

  useEffect(() => {
    if (!livekitUrl || !roomName || !token || !active) return;

    let cancelled = false;
    let ctx: AudioContext | null = null;

    (async () => {
      try {
        const { Room, RoomEvent, Track } = await import("livekit-client");
        const room = new Room();
        roomRef.current = room;
        await room.connect(livekitUrl, token);
        if (cancelled) {
          await room.disconnect();
          return;
        }
        ctx = new AudioContext();
        const newAnalyser = ctx.createAnalyser();
        newAnalyser.fftSize = 512;
        setAnalyser(newAnalyser);

        const onTrack = (track: { kind: string; mediaStreamTrack: MediaStreamTrack }) => {
          if (track.kind !== Track.Kind.Audio) return;
          const stream = new MediaStream([track.mediaStreamTrack]);
          const source = ctx!.createMediaStreamSource(stream);
          source.connect(newAnalyser);
        };

        room.on(
          RoomEvent.TrackSubscribed,
          (track: { kind: string; mediaStreamTrack: MediaStreamTrack }) => onTrack(track),
        );
        room.remoteParticipants.forEach(
          (p: {
            audioTrackPublications: Map<
              string,
              { track?: { kind: string; mediaStreamTrack: MediaStreamTrack } }
            >;
          }) => {
            p.audioTrackPublications.forEach((pub) => {
              if (pub.track) onTrack(pub.track);
            });
          },
        );
      } catch (err) {
        console.warn("[live-call-listener] connection failed", err);
      }
    })();

    return () => {
      cancelled = true;
      (async () => {
        if (roomRef.current) {
          const room = roomRef.current as { disconnect: () => Promise<void> };
          await room.disconnect().catch(() => undefined);
          roomRef.current = null;
        }
        if (ctx) await ctx.close().catch(() => undefined);
      })();
    };
  }, [livekitUrl, roomName, token, active]);

  return <Waveform analyser={analyser} active={active} className="h-32 w-full" />;
}
