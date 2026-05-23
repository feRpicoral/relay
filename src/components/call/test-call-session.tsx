"use client";

import { Mic, MicOff } from "lucide-react";
import { useEffect, useState } from "react";

import { Waveform } from "@/components/call/waveform";
import { Badge } from "@/components/ui/badge";

interface TestCallSessionProps {
  livekitUrl: string | null;
  roomName: string | null;
  token: string | null;
  active: boolean;
}

interface AttachableTrack {
  kind: string;
  mediaStreamTrack: MediaStreamTrack;
  attach: () => HTMLMediaElement;
}

/**
 * Test-call participant. Joins the LiveKit room with publish permission,
 * captures the browser microphone (so the worker has audio to react to),
 * plays back agent audio, and renders a waveform of it.
 *
 * Critical: every per-mount resource (room, audio context, attached <audio>
 * elements) lives in closure variables inside the effect — NOT in refs.
 * React Strict Mode double-invokes effects in dev, and shared refs would
 * cause cleanup-1 to teardown room-2 mid-connect, triggering "could not
 * createOffer with closed peer connection" and silent audio.
 */
export function TestCallSession({ livekitUrl, roomName, token, active }: TestCallSessionProps) {
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [micState, setMicState] = useState<"idle" | "live" | "blocked">("idle");

  useEffect(() => {
    if (!livekitUrl || !roomName || !token || !active) return;

    let cancelled = false;
    let room: { disconnect: () => Promise<void> } | null = null;
    let audioCtx: AudioContext | null = null;
    const attachedEls: HTMLMediaElement[] = [];

    // StrictMode in dev double-invokes effects. WebRTC connect/publish is not
    // idempotent — the first run's RTCPeerConnection ends up half-closed
    // mid-negotiation when the cleanup fires, producing "could not createOffer
    // with closed peer connection" and the audio never makes it back to the
    // browser. Delaying setup by a tick lets the StrictMode cleanup mark
    // cancelled=true before any LiveKit work starts; only the surviving mount
    // actually negotiates.
    const setupTimer = setTimeout(() => {
      void runSetup();
    }, 100);

    async function runSetup() {
      if (cancelled) return;
      // Capture non-null props for use inside this async closure (the outer
      // null-guard at the top of the effect doesn't narrow inside callbacks).
      const url = livekitUrl;
      const tk = token;
      if (!url || !tk) return;
      const livekit = await import("livekit-client");
      if (cancelled) return;
      const { Room, RoomEvent, Track, createLocalAudioTrack } = livekit;

      const r = new Room();
      room = r;

      // Build the audio context now so onTrack can connect sources to the
      // analyser whether the agent track was already published or not.
      audioCtx = new AudioContext();
      const localAnalyser = audioCtx.createAnalyser();
      localAnalyser.fftSize = 512;

      function onTrack(track: AttachableTrack) {
        if (cancelled) return;
        if (track.kind !== Track.Kind.Audio) return;
        // attach() makes a properly-configured <audio>; mounting in the DOM is
        // required for some browsers to actually play the MediaStream.
        const el = track.attach();
        el.style.display = "none";
        document.body.appendChild(el);
        attachedEls.push(el);
        // Also pipe through Web Audio so the waveform reacts.
        const stream = new MediaStream([track.mediaStreamTrack]);
        const source = audioCtx!.createMediaStreamSource(stream);
        source.connect(localAnalyser);
      }

      // Wire listeners BEFORE connect so we don't miss agent tracks that were
      // published while we were negotiating.
      r.on(RoomEvent.TrackSubscribed, (track: AttachableTrack) => onTrack(track));

      try {
        await r.connect(url, tk);
      } catch (err) {
        console.warn("[test-call-session] connect failed:", err);
        return;
      }
      if (cancelled) {
        await r.disconnect().catch(() => undefined);
        return;
      }

      // Catch tracks that landed while connect() was in flight.
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

      setAnalyser(localAnalyser);

      // Capture mic and publish. Browser prompts permission on first call.
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
        await (
          r as unknown as { localParticipant: { publishTrack: (t: unknown) => Promise<unknown> } }
        ).localParticipant.publishTrack(micTrack);

        // Pipe the mic through the same analyser as the agent's tracks so the
        // waveform reacts to the user's voice too — otherwise the visualizer
        // only moves when the agent speaks, which makes it look frozen during
        // the human's turn and makes it unclear whether the mic is actually
        // being captured.
        const micStream = new MediaStream([micTrack.mediaStreamTrack]);
        // audioCtx is the closure variable seeded above; TS doesn't track
        // that it's been assigned across the async boundary, hence the
        // non-null assertion (same pattern as in onTrack).
        const micSource = audioCtx!.createMediaStreamSource(micStream);
        micSource.connect(localAnalyser);

        setMicState("live");
      } catch (err) {
        console.warn("[test-call-session] mic capture blocked:", err);
        setMicState("blocked");
      }
    }

    return () => {
      cancelled = true;
      clearTimeout(setupTimer);
      for (const el of attachedEls) el.remove();
      // Fire-and-forget; do NOT await — useEffect cleanup must be sync.
      if (room) {
        void room.disconnect().catch(() => undefined);
      }
      if (audioCtx) {
        void audioCtx.close().catch(() => undefined);
      }
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
