"use server";

import { setActiveOrg } from "@/lib/auth/active-org";
import { getPrisma } from "@/lib/db/client";
import { createServerSupabase } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; error: string };

export async function acceptInviteAction(token: string): Promise<Result> {
  if (!token) return { ok: false, error: "Token ausente." };

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

  await prisma.$transaction(async (tx) => {
    await tx.membership.upsert({
      where: { orgId_userId: { orgId: invite.orgId, userId: user.id } },
      create: { orgId: invite.orgId, userId: user.id, role: invite.role },
      update: {},
    });
    await tx.invite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    });
  });

  await setActiveOrg(user.id, invite.orgId);
  return { ok: true };
}
