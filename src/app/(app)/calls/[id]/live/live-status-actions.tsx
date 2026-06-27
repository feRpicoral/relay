"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { CallStatusBadge } from "@/components/call/call-status-badge";
import { CallEndedModal } from "@/components/live/call-ended-modal";
import { useRealtimeRow } from "@/hooks/use-realtime";

import { HangupButton } from "./hangup-button";

interface CallRow {
  id: string;
  status: "RINGING" | "IN_PROGRESS" | "COMPLETED" | "FAILED" | "NO_ANSWER" | "VOICEMAIL";
}

const REDIRECT_DELAY_MS = 600;

/**
 * Renders the status badge + hangup button in the live page header. Subscribes
 * to the underlying Call row so the badge flips and the hangup button hides the
 * moment the worker (or another tab) marks the call complete. Once the call
 * ends — whether by operator hangup or worker — it shows the post-call modal
 * and pushes the user to the call detail, where the generated summary lands.
 */
export function LiveStatusActions({
  callId,
  initialStatus,
}: {
  callId: string;
  initialStatus: CallRow["status"];
}) {
  const router = useRouter();
  const row = useRealtimeRow<CallRow>({
    table: "calls",
    id: callId,
    initial: { id: callId, status: initialStatus },
  });

  const [ended, setEnded] = useState(false);
  const redirectedRef = useRef(false);

  const finishAndRedirect = useCallback(() => {
    if (redirectedRef.current) return;
    redirectedRef.current = true;
    setEnded(true);
    setTimeout(() => router.replace(`/calls/${callId}`), REDIRECT_DELAY_MS);
  }, [callId, router]);

  const active = row.status === "RINGING" || row.status === "IN_PROGRESS";

  useEffect(() => {
    if (!active) finishAndRedirect();
  }, [active, finishAndRedirect]);

  return (
    <div className="flex items-center gap-2">
      <CallStatusBadge status={row.status} />
      {active ? <HangupButton callId={callId} onEnded={finishAndRedirect} /> : null}
      <CallEndedModal open={ended} />
    </div>
  );
}
