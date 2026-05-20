"use server";

import { requireSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/with-org";
import { deleteRoom } from "@/lib/voice/livekit";

type Result = { ok: true } | { ok: false; error: string };

export async function hangupAction(callId: string): Promise<Result> {
  const session = await requireSession();
  const db = getDb(session.orgId);
  const call = await db.call.findUnique({ where: { id: callId } });
  if (!call) return { ok: false, error: "Chamada não encontrada." };
  if (call.status !== "IN_PROGRESS" && call.status !== "RINGING") {
    return { ok: false, error: "Chamada já encerrada." };
  }

  await db.call.update({
    where: { id: callId },
    data: {
      status: "COMPLETED",
      endedAt: new Date(),
      durationMs: call.startedAt ? Date.now() - call.startedAt.getTime() : null,
    },
  });
  if (call.livekitRoomName) {
    await deleteRoom(call.livekitRoomName);
  }
  return { ok: true };
}
