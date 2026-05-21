"use server";

import { Prisma } from "@prisma/client";
import { customAlphabet } from "nanoid";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db/with-org";
import { sendInviteEmail } from "@/lib/email/invite";
import { requireEnv } from "@/lib/env";

const tokenGen = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 32);

/** How long an invite link stays valid. */
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

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
  const normalizedEmail = parsed.data.email.toLowerCase();

  const existingMember = await db.membership.findFirst({
    where: { user: { email: normalizedEmail } },
  });
  if (existingMember) {
    return { ok: false, error: "Esse email já faz parte da organização." };
  }

  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);
  const token = tokenGen();

  const invite = await db.invite.upsert({
    where: { orgId_email: { orgId: session.orgId, email: normalizedEmail } },
    create: {
      orgId: session.orgId,
      email: normalizedEmail,
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
    // The invite row exists; the user can re-trigger the email by re-inviting.
    // We surface a partial-success message so the admin knows to retry.
    console.warn("[invite] email send failed:", err);
    revalidatePath("/settings/members");
    return {
      ok: false,
      error: "Convite criado, mas o email falhou. Reenvie em alguns instantes.",
    };
  }

  revalidatePath("/settings/members");
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

  // Wrap the last-admin check + the role update in one serializable transaction
  // so two concurrent demotions can't race past the count check and leave the
  // org with zero admins.
  try {
    await db.$transaction(
      async (tx) => {
        const membership = await tx.membership.findUnique({
          where: { id: parsed.data.membershipId },
        });
        if (!membership) throw new MemberNotFoundError();
        if (membership.userId === session.userId) {
          throw new CannotChangeSelfError();
        }
        if (parsed.data.role === "MEMBER" && membership.role === "ADMIN") {
          const adminCount = await tx.membership.count({ where: { role: "ADMIN" } });
          if (adminCount <= 1) throw new LastAdminError();
        }
        await tx.membership.update({
          where: { id: parsed.data.membershipId },
          data: { role: parsed.data.role },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (err) {
    if (err instanceof MemberNotFoundError) return { ok: false, error: "Membro não encontrado." };
    if (err instanceof CannotChangeSelfError) {
      return { ok: false, error: "Você não pode mudar seu próprio papel." };
    }
    if (err instanceof LastAdminError) return { ok: false, error: "Mantenha pelo menos um admin." };
    throw err;
  }

  revalidatePath("/settings/members");
  return { ok: true };
}

const RemoveSchema = z.object({ membershipId: z.string().uuid() });

export async function removeMemberAction(input: z.infer<typeof RemoveSchema>): Promise<Result> {
  const session = await requireAdmin();
  const parsed = RemoveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Entrada inválida." };

  const db = getDb(session.orgId);

  try {
    await db.$transaction(
      async (tx) => {
        const membership = await tx.membership.findUnique({
          where: { id: parsed.data.membershipId },
        });
        if (!membership) throw new MemberNotFoundError();
        if (membership.userId === session.userId) throw new CannotChangeSelfError();
        if (membership.role === "ADMIN") {
          const adminCount = await tx.membership.count({ where: { role: "ADMIN" } });
          if (adminCount <= 1) throw new LastAdminError();
        }
        await tx.membership.delete({ where: { id: parsed.data.membershipId } });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (err) {
    if (err instanceof MemberNotFoundError) return { ok: false, error: "Membro não encontrado." };
    if (err instanceof CannotChangeSelfError) {
      return { ok: false, error: "Você não pode se remover." };
    }
    if (err instanceof LastAdminError) return { ok: false, error: "Mantenha pelo menos um admin." };
    throw err;
  }

  // Note: we do not clear the removed user's `app_metadata.active_org_id`. The
  // layout's membership lookup fails on their next request and bounces them to
  // /create-org, which is the correct end state.
  revalidatePath("/settings/members");
  return { ok: true };
}

const RevokeInviteSchema = z.object({ inviteId: z.string().uuid() });

export async function revokeInviteAction(
  input: z.infer<typeof RevokeInviteSchema>,
): Promise<Result> {
  const session = await requireAdmin();
  const parsed = RevokeInviteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Entrada inválida." };

  // Org-scoped delete: `deleteMany` returns count 0 if no row matched, which
  // is fine — the row was either already gone or belonged to another org. We
  // do NOT fall back to a service-role delete; that path could be abused to
  // delete a different org's invite.
  const db = getDb(session.orgId);
  await db.invite.deleteMany({ where: { id: parsed.data.inviteId } });
  revalidatePath("/settings/members");
  return { ok: true };
}

class MemberNotFoundError extends Error {
  constructor() {
    super("member_not_found");
    this.name = "MemberNotFoundError";
  }
}
class CannotChangeSelfError extends Error {
  constructor() {
    super("cannot_change_self");
    this.name = "CannotChangeSelfError";
  }
}
class LastAdminError extends Error {
  constructor() {
    super("last_admin");
    this.name = "LastAdminError";
  }
}
