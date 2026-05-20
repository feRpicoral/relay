import { redirect } from "next/navigation";

import { AppSidebar } from "@/components/app-sidebar";
import { PostHogProvider } from "@/components/posthog-provider";
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
      user: { select: { name: true, email: true } },
    },
  });
  if (!membership) redirect("/create-org");

  return (
    <PostHogProvider>
      <TooltipProvider delayDuration={300}>
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
