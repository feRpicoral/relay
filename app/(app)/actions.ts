"use server";

import { z } from "zod";

import { requireSession } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db/client";
import type { Result } from "@/lib/types/result";

const ThemeSchema = z.object({ theme: z.enum(["light", "dark"]) });

/**
 * Persist the user's chosen theme so it follows them across devices/browsers.
 * The client also writes to localStorage for instant feedback; the DB write
 * is what guarantees the choice survives a fresh device sign-in (where there
 * is no localStorage to read from).
 */
export async function setThemePreferenceAction(
  input: z.infer<typeof ThemeSchema>,
): Promise<Result> {
  const session = await requireSession();
  const parsed = ThemeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid theme." };

  await getPrisma().user.update({
    where: { id: session.userId },
    data: { themePreference: parsed.data.theme === "dark" ? "DARK" : "LIGHT" },
  });
  return { ok: true };
}
