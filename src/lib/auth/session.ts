import "server-only";

import type { MembershipRole } from "@prisma/client";
import { redirect } from "next/navigation";

import { resolveActiveOrgId } from "@/lib/auth/active-org";
import { getPrisma } from "@/lib/db/client";
import { asOrgId, asUserId, type OrgId, type UserId } from "@/lib/db/types";
import { createServerSupabase } from "@/lib/supabase/server";

export interface Session {
  userId: UserId;
  email: string;
  userName: string | null;
  orgId: OrgId;
  orgName: string;
  orgSlug: string;
  role: MembershipRole;
}

interface AuthState {
  userId: UserId | null;
  email: string | null;
  activeOrgId: OrgId | null;
}

async function getAuthState(): Promise<AuthState> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { userId: null, email: null, activeOrgId: null };

  const activeOrgIdRaw =
    typeof user.app_metadata?.active_org_id === "string" ? user.app_metadata.active_org_id : null;

  return {
    userId: asUserId(user.id),
    email: user.email ?? null,
    activeOrgId: activeOrgIdRaw ? asOrgId(activeOrgIdRaw) : null,
  };
}

export async function getSession(): Promise<Session | null> {
  const { userId, email, activeOrgId } = await getAuthState();
  if (!userId || !email || !activeOrgId) return null;

  const membership = await getPrisma().membership.findUnique({
    where: { orgId_userId: { orgId: activeOrgId, userId } },
    include: {
      organization: { select: { id: true, name: true, slug: true } },
      user: { select: { name: true } },
    },
  });
  if (!membership) return null;

  return {
    userId,
    email,
    userName: membership.user.name,
    orgId: asOrgId(membership.organization.id),
    orgName: membership.organization.name,
    orgSlug: membership.organization.slug,
    role: membership.role,
  };
}

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireAdmin(): Promise<Session> {
  const session = await requireSession();
  if (session.role !== "ADMIN") redirect("/overview");
  return session;
}

export async function requireSessionOrOnboard(): Promise<Session> {
  const { userId, email, activeOrgId } = await getAuthState();
  if (!userId) redirect("/login");
  if (!email) redirect("/login");

  // Repair `app_metadata.active_org_id` in-place if missing so the caller can
  // resolve a session on this same request instead of bouncing through a
  // separate redirect (the previous `/auth/select-org` target never existed).
  const resolvedOrgId = await resolveActiveOrgId({ userId, activeOrgId });
  if (!resolvedOrgId) redirect("/create-org");

  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}
