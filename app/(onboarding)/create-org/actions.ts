"use server";

import { customAlphabet } from "nanoid";
import { z } from "zod";

import { setActiveOrg } from "@/lib/auth/active-org";
import { getPrisma } from "@/lib/db/client";
import { slugify } from "@/lib/slug";
import { createServerSupabase } from "@/lib/supabase/server";

const Schema = z.object({ name: z.string().min(2).max(120) });
const slugSuffix = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 6);

type Result = { ok: true; orgId: string } | { ok: false; error: string };

export async function createOrgAction(formData: FormData): Promise<Result> {
  const parsed = Schema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { ok: false, error: "Nome inválido." };

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const baseSlug = slugify(parsed.data.name) || "org";
  let slug = baseSlug;

  // Suffix on conflict.
  const prisma = getPrisma();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const exists = await prisma.organization.findUnique({ where: { slug } });
    if (!exists) break;
    slug = `${baseSlug}-${slugSuffix()}`;
  }

  const org = await prisma.organization.create({
    data: {
      name: parsed.data.name,
      slug,
      memberships: {
        create: {
          userId: user.id,
          role: "ADMIN",
        },
      },
    },
  });

  await setActiveOrg(user.id, org.id);

  return { ok: true, orgId: org.id };
}
