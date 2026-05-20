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
      <div className="flex-1 overflow-hidden">
        <TranscriptHistory rows={transcripts} currentMs={currentMs} />
      </div>
    </>
  );
}
