"use server";

import { customAlphabet } from "nanoid";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db/client";
import { getDb } from "@/lib/db/with-org";
import { sendInviteEmail } from "@/lib/email/invite";
import { requireEnv } from "@/lib/env";

const tokenGen = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 32);

const InviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "MEMBER"]),
});

type Result = { ok: true } | { ok: false; error: string };

export async function inviteMemberAction(input: z.infer<typeof InviteSchema>): Promise<Result> {
  const session = await requireAdmin();
  const parsed = InviteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Email inválido." };

  const db = getDb(session.orgId);

  const existingMember = await db.membership.findFirst({
    where: { user: { email: parsed.data.email.toLowerCase() } },
  });
  if (existingMember) {
    return { ok: false, error: "Esse email já faz parte da organização." };
  }

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const token = tokenGen();

  const invite = await db.invite.upsert({
    where: { orgId_email: { orgId: session.orgId, email: parsed.data.email.toLowerCase() } },
    create: {
      orgId: session.orgId,
      email: parsed.data.email.toLowerCase(),
      role: parsed.data.role,
      token,
      createdByUserId: session.userId,
      expiresAt,
    },
    update: {
      role: parsed.data.role,
      token,
      acceptedAt: null,
      createdByUserId: session.userId,
      expiresAt,
    },
  });

  const acceptUrl = new URL("/accept-invite", requireEnv("NEXT_PUBLIC_APP_URL"));
  acceptUrl.searchParams.set("token", invite.token);

  try {
    await sendInviteEmail({
      to: invite.email,
      orgName: session.orgName,
      inviterName: session.email,
      acceptUrl: acceptUrl.toString(),
    });
  } catch (err) {
    console.warn("[invite] email send failed:", err);
  }

  return { ok: true };
}

const ChangeRoleSchema = z.object({
  membershipId: z.string().uuid(),
  role: z.enum(["ADMIN", "MEMBER"]),
});

export async function changeRoleAction(input: z.infer<typeof ChangeRoleSchema>): Promise<Result> {
  const session = await requireAdmin();
  const parsed = ChangeRoleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Entrada inválida." };

  const db = getDb(session.orgId);

  const membership = await db.membership.findUnique({ where: { id: parsed.data.membershipId } });
  if (!membership) return { ok: false, error: "Membro não encontrado." };
  if (membership.userId === session.userId) {
    return { ok: false, error: "Você não pode mudar seu próprio papel." };
  }

  // Don't allow removing the last admin.
  if (parsed.data.role === "MEMBER" && membership.role === "ADMIN") {
    const adminCount = await db.membership.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) return { ok: false, error: "Mantenha pelo menos um admin." };
  }

  await db.membership.update({
    where: { id: parsed.data.membershipId },
    data: { role: parsed.data.role },
  });
  return { ok: true };
}

const RemoveSchema = z.object({ membershipId: z.string().uuid() });

export async function removeMemberAction(input: z.infer<typeof RemoveSchema>): Promise<Result> {
  const session = await requireAdmin();
  const parsed = RemoveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Entrada inválida." };

  const db = getDb(session.orgId);
  const membership = await db.membership.findUnique({ where: { id: parsed.data.membershipId } });
  if (!membership) return { ok: false, error: "Membro não encontrado." };
  if (membership.userId === session.userId) {
    return { ok: false, error: "Você não pode se remover." };
  }
  if (membership.role === "ADMIN") {
    const adminCount = await db.membership.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) return { ok: false, error: "Mantenha pelo menos um admin." };
  }

  await db.membership.delete({ where: { id: parsed.data.membershipId } });

  // Drop their app_metadata.active_org_id if it pointed to this org.
  // Service role required, but we don't have user IDs to clear individually safely here.
  // Their next login will redirect to /create-org since no membership exists.
  return { ok: true };
}

const RevokeInviteSchema = z.object({ inviteId: z.string().uuid() });

export async function revokeInviteAction(
  input: z.infer<typeof RevokeInviteSchema>,
): Promise<Result> {
  const session = await requireAdmin();
  const parsed = RevokeInviteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Entrada inválida." };

  const db = getDb(session.orgId);
  await db.invite.delete({ where: { id: parsed.data.inviteId } }).catch(() => null);
  // Suppress prisma's "Record to delete does not exist"; use getPrisma() so RLS isn't an issue.
  await getPrisma()
    .invite.delete({ where: { id: parsed.data.inviteId } })
    .catch(() => null);
  return { ok: true };
}
