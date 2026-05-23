"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { CallStatusBadge } from "@/components/call/call-status-badge";
import { useRealtimeRow } from "@/hooks/use-realtime";

import { HangupButton } from "./hangup-button";

interface CallRow {
  id: string;
  status: "RINGING" | "IN_PROGRESS" | "COMPLETED" | "FAILED" | "NO_ANSWER" | "VOICEMAIL";
}

/**
 * Renders the status badge + hangup button in the live page header. Subscribes
 * to the underlying Call row so the badge flips and the hangup button hides
 * the moment the worker (or another tab) marks the call complete. Also pushes
 * the user to the post-call detail page once the call ends — there's nothing
 * useful left to show on the live monitor.
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

  const redirectedRef = useRef(false);
  useEffect(() => {
    const active = row.status === "RINGING" || row.status === "IN_PROGRESS";
    if (!active && !redirectedRef.current) {
      redirectedRef.current = true;
      // Small delay so the user sees the badge flip before navigation.
      const timer = setTimeout(() => router.replace(`/calls/${callId}`), 600);
      return () => clearTimeout(timer);
    }
  }, [row.status, callId, router]);

  const active = row.status === "RINGING" || row.status === "IN_PROGRESS";

  return (
    <div className="flex items-center gap-2">
      <CallStatusBadge status={row.status} />
      {active ? <HangupButton callId={callId} /> : null}
    </div>
  );
}
