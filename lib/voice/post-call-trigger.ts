import "server-only";

import { inngest } from "@/lib/inngest/client";

/**
 * Fire `call/completed` so Inngest runs the post-call analysis pipeline.
 *
 * The worker calls this after marking the Call as COMPLETED. Idempotency is
 * enforced inside the function (it bails if `processedAt` is set).
 */
export async function triggerPostCallAnalysis(callId: string): Promise<void> {
  await inngest.send({ name: "call/completed", data: { callId } }).catch((err) => {
    console.warn("[post-call-trigger] inngest send failed", err);
  });
}
