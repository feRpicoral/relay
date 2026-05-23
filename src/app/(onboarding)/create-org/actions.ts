"use server";

import { Prisma } from "@prisma/client";
import { customAlphabet } from "nanoid";
import { getTranslations } from "next-intl/server";
import { z } from "zod";

import { setActiveOrg } from "@/lib/auth/active-org";
import { getPrisma } from "@/lib/db/client";
import { slugify } from "@/lib/slug";
import { createServerSupabase } from "@/lib/supabase/server";
import type { Result } from "@/lib/types/result";

const Schema = z.object({ name: z.string().trim().min(2).max(120) });
const slugSuffix = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 6);

/** Slug-collision retry budget. Each attempt re-rolls the random suffix. */
const SLUG_MAX_ATTEMPTS = 5;

export async function createOrgAction(formData: FormData): Promise<Result<{ orgId: string }>> {
  const t = await getTranslations("onboarding.createOrg.errors");
  const parsed = Schema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { ok: false, error: t("invalidName") };

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: t("sessionExpired") };

  // Idempotency guard: if the user already has any membership, send them back
  // to the dashboard instead of silently creating a second org.
  const prisma = getPrisma();
  const existing = await prisma.membership.findFirst({
    where: { userId: user.id },
    select: { orgId: true },
  });
  if (existing) {
    await setActiveOrg(user.id, existing.orgId).catch(() => undefined);
    return { ok: true, orgId: existing.orgId };
  }

  const baseSlug = slugify(parsed.data.name) || "org";

  // Race-safe slug allocation: instead of read-then-write (TOCTOU), we let the
  // unique constraint fail and retry with a fresh suffix on P2002.
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < SLUG_MAX_ATTEMPTS; attempt += 1) {
    const slug = attempt === 0 ? baseSlug : `${baseSlug}-${slugSuffix()}`;
    try {
      const org = await prisma.organization.create({
        data: {
          name: parsed.data.name,
          slug,
          memberships: {
            create: { userId: user.id, role: "ADMIN" },
          },
        },
      });
      // setActiveOrg writes to Supabase user_metadata via the admin API. If it
      // fails the user's session won't carry an active_org_id, but the org +
      // membership exist; the next sign-in resolves it via membership lookup.
      try {
        await setActiveOrg(user.id, org.id);
      } catch (err) {
        console.warn("[create-org] setActiveOrg failed", err);
      }
      return { ok: true, orgId: org.id };
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        lastErr = err;
        continue;
      }
      throw err;
    }
  }

  console.error("[create-org] slug allocation exhausted", lastErr);
  return { ok: false, error: t("slugExhausted") };
}
