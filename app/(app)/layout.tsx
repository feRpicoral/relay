import { redirect } from "next/navigation";

import { AppSidebar } from "@/components/app-sidebar";
import { PostHogProvider } from "@/components/posthog-provider";
import { ThemeSync } from "@/components/theme-sync";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getPrisma } from "@/lib/db/client";
import { createServerSupabase } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const activeOrgId =
    typeof user.app_metadata?.active_org_id === "string" ? user.app_metadata.active_org_id : null;
  if (!activeOrgId) redirect("/create-org");

  const membership = await getPrisma().membership.findUnique({
    where: { orgId_userId: { orgId: activeOrgId, userId: user.id } },
    include: {
      organization: { select: { name: true, slug: true } },
      // themePreference comes through here so ThemeSync can overwrite the
      // client's localStorage on every (app) render with the DB value —
      // that's what makes the user's choice follow them across devices.
      user: { select: { name: true, email: true, themePreference: true } },
    },
  });
  if (!membership) redirect("/create-org");

  const initialTheme = membership.user.themePreference === "DARK" ? "dark" : "light";

  return (
    <PostHogProvider>
      <TooltipProvider delayDuration={300}>
        <ThemeSync initial={initialTheme} />
        <div className="flex">
          <AppSidebar
            user={{ email: membership.user.email, name: membership.user.name }}
            org={{ name: membership.organization.name, slug: membership.organization.slug }}
            role={membership.role}
          />
          <main className="bg-background flex min-h-screen flex-1 flex-col">{children}</main>
        </div>
      </TooltipProvider>
    </PostHogProvider>
  );
}
