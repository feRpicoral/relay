"use client";

import { useState } from "react";

import { AudioPlayer } from "@/components/call/audio-player";
import { TranscriptHistory } from "@/components/call/transcript-history";

interface DetailBodyProps {
  recordingUrl: string | null;
  transcripts: Array<{
    id: string;
    speaker: "USER" | "AGENT" | "SYSTEM";
    text: string;
    startMs: number;
    endMs: number;
    sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE" | "MIXED" | null;
  }>;
}

export function CallDetailBody({ recordingUrl, transcripts }: DetailBodyProps) {
  const [currentMs, setCurrentMs] = useState(0);

  return (
    <>
      <div className="border-border border-b p-3">
        <AudioPlayer src={recordingUrl} onTimeUpdate={setCurrentMs} />
      </div>
      {/* `min-h-0` lets the flex child shrink under overflow-hidden. Without
          it a long transcript pushes the card past h-[640px] and the whole
          page becomes vertically scrollable. Same fix as live page. */}
      <div className="min-h-0 flex-1 overflow-hidden">
        <TranscriptHistory rows={transcripts} currentMs={currentMs} />
      </div>
    </>
  );
}
