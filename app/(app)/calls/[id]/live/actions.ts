"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/with-org";
import type { Result } from "@/lib/types/result";
import { deleteRoom } from "@/lib/voice/livekit";

const Schema = z.object({ callId: z.string().uuid() });

export async function hangupAction(input: z.infer<typeof Schema>): Promise<Result> {
  const session = await requireSession();
  const parsed = Schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Entrada inválida." };

  const db = getDb(session.orgId);
  const call = await db.call.findUnique({ where: { id: parsed.data.callId } });
  if (!call) return { ok: false, error: "Chamada não encontrada." };
  if (call.status !== "IN_PROGRESS" && call.status !== "RINGING") {
    return { ok: false, error: "Chamada já encerrada." };
  }
  if (!call.startedAt) {
    // Worker-side state machine should always populate startedAt before
    // RINGING; if we hit this branch it's a data bug we want to know about.
    console.warn("[hangupAction] call missing startedAt", { callId: parsed.data.callId });
  }

  await db.call.updateMany({
    where: { id: parsed.data.callId, status: { in: ["IN_PROGRESS", "RINGING"] } },
    data: {
      status: "COMPLETED",
      endedAt: new Date(),
      durationMs: call.startedAt ? Date.now() - call.startedAt.getTime() : null,
    },
  });
  if (call.livekitRoomName) {
    await deleteRoom(call.livekitRoomName);
  }
  revalidatePath("/calls");
  revalidatePath(`/calls/${parsed.data.callId}`);
  return { ok: true };
}
