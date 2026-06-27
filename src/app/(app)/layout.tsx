import { redirect } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

import { AppSidebar, MobileNav } from "@/components/app-sidebar";
import { PostHogProvider } from "@/components/posthog-provider";
import { ThemeSync } from "@/components/theme-sync";
import { TooltipProvider } from "@/components/ui/tooltip";
import { fromPrismaLocale } from "@/i18n/config";
import { resolveActiveOrgId } from "@/lib/auth/active-org";
import { getPrisma } from "@/lib/db/client";
import { createServerSupabase } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const rawActiveOrgId =
    typeof user.app_metadata?.active_org_id === "string" ? user.app_metadata.active_org_id : null;
  const activeOrgId = await resolveActiveOrgId({ userId: user.id, activeOrgId: rawActiveOrgId });
  if (!activeOrgId) redirect("/create-org");

  const membership = await getPrisma().membership.findUnique({
    where: { orgId_userId: { orgId: activeOrgId, userId: user.id } },
    include: {
      organization: { select: { name: true, slug: true } },
      // themePreference + locale come through here so the client-side state
      // (next-themes localStorage; next-intl provider) converges to the DB
      // value on every render. That's what makes the user's choice follow
      // them across devices.
      user: { select: { name: true, email: true, themePreference: true, locale: true } },
    },
  });
  if (!membership) redirect("/create-org");

  const initialTheme = membership.user.themePreference === "DARK" ? "dark" : "light";
  const locale = fromPrismaLocale(membership.user.locale);
  const messages = await getMessages({ locale });

  const activeCalls = await getPrisma().call.count({
    where: { orgId: activeOrgId, status: { in: ["RINGING", "IN_PROGRESS"] } },
  });
  const hasActiveCalls = activeCalls > 0;
  const sidebarProps = {
    user: { email: membership.user.email, name: membership.user.name },
    org: { name: membership.organization.name, slug: membership.organization.slug },
    role: membership.role,
    hasActiveCalls,
  };

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <PostHogProvider>
        <TooltipProvider delayDuration={300}>
          <ThemeSync initial={initialTheme} />
          <div className="flex">
            <AppSidebar {...sidebarProps} />
            <div className="flex min-h-screen min-w-0 flex-1 flex-col">
              <MobileNav {...sidebarProps} />
              <main className="bg-background flex flex-1 flex-col">{children}</main>
            </div>
          </div>
        </TooltipProvider>
      </PostHogProvider>
    </NextIntlClientProvider>
  );
}
