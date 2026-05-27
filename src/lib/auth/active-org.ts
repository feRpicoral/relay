import "server-only";

import { getPrisma } from "@/lib/db/client";
import { getServiceSupabase } from "@/lib/supabase/admin";

/**
 * Sets the active org id for a user in their Supabase `app_metadata`. RLS policies
 * can read this with `auth.jwt() -> 'app_metadata' ->> 'active_org_id'` if needed,
 * and `getSession()` reads it on the server.
 */
export async function setActiveOrg(userId: string, orgId: string): Promise<void> {
  const supabase = getServiceSupabase();
  const { data: existing } = await supabase.auth.admin.getUserById(userId);
  const previousMetadata = (existing.user?.app_metadata ?? {}) as Record<string, unknown>;
  const { error } = await supabase.auth.admin.updateUserById(userId, {
    app_metadata: { ...previousMetadata, active_org_id: orgId },
  });
  if (error) throw error;
}

/**
 * Returns a usable active org id for the user. If `app_metadata.active_org_id`
 * is missing but the user has at least one membership, the metadata is
 * repaired in-place so subsequent requests skip the recovery branch. Returns
 * `null` only when the user truly has no organization yet — callers should
 * route those users to onboarding.
 *
 * Avoids the redirect loop between `(app)/layout.tsx` and `(onboarding)/create-org`
 * when an existing user's metadata was never seeded (e.g. they were invited
 * into an org and `setActiveOrg` failed silently during accept).
 */
export async function resolveActiveOrgId(input: {
  userId: string;
  activeOrgId: string | null;
}): Promise<string | null> {
  if (input.activeOrgId) return input.activeOrgId;
  const membership = await getPrisma().membership.findFirst({
    where: { userId: input.userId },
    select: { orgId: true },
    orderBy: { createdAt: "asc" },
  });
  if (!membership) return null;
  await setActiveOrg(input.userId, membership.orgId).catch((err) => {
    console.warn("[active-org] auto-repair setActiveOrg failed", err);
  });
  return membership.orgId;
}
