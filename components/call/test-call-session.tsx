"use client";

import { Mic, MicOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Waveform } from "@/components/call/waveform";
import { Badge } from "@/components/ui/badge";

// LiveKit's RemoteTrack carries an `attach()` method that returns an HTML
// audio/video element wired up for autoplay. We use it instead of building our
// own <audio> with srcObject because browser autoplay policies silently drop
// MediaStream playback without the right element setup.
interface AttachableTrack {
  kind: string;
  mediaStreamTrack: MediaStreamTrack;
  attach: () => HTMLMediaElement;
  detach: () => HTMLMediaElement[];
}

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
  const attachedElementsRef = useRef<HTMLMediaElement[]>([]);

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

        const onTrack = (track: AttachableTrack) => {
          if (track.kind !== Track.Kind.Audio) return;
          // attach() returns an <audio> wired for autoplay; we have to put it
          // in the DOM (some browsers silently mute disconnected media).
          const element = track.attach();
          element.style.display = "none";
          document.body.appendChild(element);
          attachedElementsRef.current.push(element);
          // Feed the same stream to the analyser for the waveform display.
          const stream = new MediaStream([track.mediaStreamTrack]);
          const source = ctx!.createMediaStreamSource(stream);
          source.connect(newAnalyser);
        };

        room.on(RoomEvent.TrackSubscribed, (track: AttachableTrack) => onTrack(track));
        room.remoteParticipants.forEach(
          (p: { audioTrackPublications: Map<string, { track?: AttachableTrack }> }) => {
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
      // Pull elements off the DOM before disconnecting so a quick re-render
      // (StrictMode double-invoke in dev) doesn't leave orphan <audio> tags.
      for (const el of attachedElementsRef.current) {
        el.remove();
      }
      attachedElementsRef.current = [];
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
