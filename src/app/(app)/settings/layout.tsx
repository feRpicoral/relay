import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/page-header";
import { requireSession } from "@/lib/auth/session";

import { TabLink } from "./tab-link";

type SettingsTabKey = "organization" | "preferences" | "members" | "telephony" | "calendar";

interface SettingsTab {
  href: string;
  labelKey: SettingsTabKey;
  adminOnly?: boolean;
}

const tabs: SettingsTab[] = [
  { href: "/settings", labelKey: "organization" },
  { href: "/settings/preferences", labelKey: "preferences" },
  { href: "/settings/members", labelKey: "members", adminOnly: true },
  { href: "/settings/telephony", labelKey: "telephony", adminOnly: true },
  { href: "/settings/calendar", labelKey: "calendar", adminOnly: true },
];

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const t = await getTranslations("settings");
  const tTabs = await getTranslations("settings.tabs");
  const isAdmin = session.role === "ADMIN";

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("workspaceDescription", { orgName: session.orgName })}
      />
      <div className="border-border overflow-x-auto border-b px-4 sm:px-8">
        <nav className="-mb-px flex gap-4 sm:gap-6">
          {tabs.map((tab) => (
            <TabLink
              key={tab.href}
              href={tab.href}
              label={tTabs(tab.labelKey)}
              locked={Boolean(tab.adminOnly) && !isAdmin}
              lockLabel={t("memberLockTooltip")}
            />
          ))}
        </nav>
      </div>
      <div className="p-4 sm:p-8">{children}</div>
    </>
  );
}
