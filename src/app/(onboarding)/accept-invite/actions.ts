"use server";

import { getTranslations } from "next-intl/server";

import { setActiveOrg } from "@/lib/auth/active-org";
import { getPrisma } from "@/lib/db/client";
import { createServerSupabase } from "@/lib/supabase/server";
import type { Result } from "@/lib/types/result";

export async function acceptInviteAction(token: string): Promise<Result> {
  const t = await getTranslations("onboarding.acceptInvite.errors");

  if (!token || token.length < 8 || token.length > 200) {
    return { ok: false, error: t("missingToken") };
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: t("signInFirst") };

  const prisma = getPrisma();
  const invite = await prisma.invite.findUnique({ where: { token } });
  if (!invite) return { ok: false, error: t("inviteNotFound") };
  if (invite.acceptedAt) return { ok: false, error: t("inviteUsed") };
  if (invite.expiresAt < new Date()) return { ok: false, error: t("inviteExpired") };
  if (invite.email.toLowerCase() !== user.email?.toLowerCase()) {
    return { ok: false, error: t("wrongEmail") };
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
