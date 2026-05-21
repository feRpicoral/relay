"use client";

import { Mic, MicOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Waveform } from "@/components/call/waveform";
import { Badge } from "@/components/ui/badge";

interface TestCallSessionProps {
  livekitUrl: string | null;
  roomName: string | null;
  token: string | null;
  active: boolean;
}

/**
 * Test-call participant. Unlike LiveCallListener (passive), this joins the
 * LiveKit room WITH publish permission and captures the browser microphone
 * so the agent worker has audio to react to. Also plays back the agent's
 * outbound audio and renders a waveform of it.
 *
 * The page swaps this in for LiveCallListener when the call is a test
 * (callerE164 = "+0000000TEST") so the operator running the test actually
 * speaks into the room rather than just observing it.
 */
export function TestCallSession({ livekitUrl, roomName, token, active }: TestCallSessionProps) {
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [micState, setMicState] = useState<"idle" | "live" | "blocked">("idle");
  const roomRef = useRef<unknown | null>(null);

  useEffect(() => {
    if (!livekitUrl || !roomName || !token || !active) return;

    let cancelled = false;
    let ctx: AudioContext | null = null;

    (async () => {
      try {
        const { Room, RoomEvent, Track, createLocalAudioTrack } = await import("livekit-client");
        const room = new Room();
        roomRef.current = room;
        await room.connect(livekitUrl, token);
        if (cancelled) {
          await room.disconnect();
          return;
        }

        // Set up analyser to visualize the agent's outbound audio.
        ctx = new AudioContext();
        const newAnalyser = ctx.createAnalyser();
        newAnalyser.fftSize = 512;
        setAnalyser(newAnalyser);

        const onTrack = (track: { kind: string; mediaStreamTrack: MediaStreamTrack }) => {
          if (track.kind !== Track.Kind.Audio) return;
          const stream = new MediaStream([track.mediaStreamTrack]);
          // Play the agent audio through the speakers AND feed the analyser
          // (`MediaStreamSource` doesn't emit audio on its own).
          const playback = new Audio();
          playback.srcObject = stream;
          playback.autoplay = true;
          void playback.play().catch(() => undefined);
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

        // Capture mic and publish. Browser prompts for permission on the first
        // `createLocalAudioTrack` call. If denied, leave the participant in the
        // room as a silent listener so the operator can still see the agent.
        try {
          const micTrack = await createLocalAudioTrack({
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          });
          if (cancelled) {
            micTrack.stop();
            return;
          }
          await room.localParticipant.publishTrack(micTrack);
          setMicState("live");
        } catch (err) {
          console.warn("[test-call-session] mic capture blocked:", err);
          setMicState("blocked");
        }
      } catch (err) {
        console.warn("[test-call-session] connection failed:", err);
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

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {micState === "live" ? (
          <Badge variant="success" className="gap-1 text-[10px]">
            <Mic className="h-3 w-3" />
            Microfone ao vivo, fale com o agente
          </Badge>
        ) : micState === "blocked" ? (
          <Badge variant="destructive" className="gap-1 text-[10px]">
            <MicOff className="h-3 w-3" />
            Permissão de microfone negada, recarregue e permita
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[10px]">
            Conectando...
          </Badge>
        )}
      </div>
      <Waveform analyser={analyser} active={active} className="h-32 w-full" />
    </div>
  );
}
