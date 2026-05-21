"use server";

import { setActiveOrg } from "@/lib/auth/active-org";
import { getPrisma } from "@/lib/db/client";
import { createServerSupabase } from "@/lib/supabase/server";
import type { Result } from "@/lib/types/result";

export async function acceptInviteAction(token: string): Promise<Result> {
  if (!token || token.length < 8 || token.length > 200) {
    return { ok: false, error: "Token ausente." };
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Faça login primeiro." };

  const prisma = getPrisma();
  const invite = await prisma.invite.findUnique({ where: { token } });
  if (!invite) return { ok: false, error: "Convite não encontrado." };
  if (invite.acceptedAt) return { ok: false, error: "Convite já usado." };
  if (invite.expiresAt < new Date()) return { ok: false, error: "Convite expirado." };
  if (invite.email.toLowerCase() !== user.email?.toLowerCase()) {
    return { ok: false, error: "Esse convite é pra outro email." };
  }

  // Idempotent inside a transaction:
  // - Membership upsert deduplicates if accept-invite is called twice in a row.
  // - invite.update filters on acceptedAt: null so concurrent accepts can't
  //   both flip the row; only the first transaction succeeds.
  const { acceptResult } = await prisma.$transaction(async (tx) => {
    await tx.membership.upsert({
      where: { orgId_userId: { orgId: invite.orgId, userId: user.id } },
      create: { orgId: invite.orgId, userId: user.id, role: invite.role },
      update: {},
    });
    const updated = await tx.invite.updateMany({
      where: { id: invite.id, acceptedAt: null },
      data: { acceptedAt: new Date() },
    });
    return { acceptResult: updated.count };
  });

  if (acceptResult === 0) {
    // Another request beat us to it; treat as success since the user is now
    // a member (the upsert covered that path).
  }

  try {
    await setActiveOrg(user.id, invite.orgId);
  } catch (err) {
    console.warn("[accept-invite] setActiveOrg failed", err);
  }
  return { ok: true };
}
