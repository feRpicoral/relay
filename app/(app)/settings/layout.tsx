import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { requireSession } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/settings", label: "Organização" },
  { href: "/settings/members", label: "Membros", adminOnly: true },
  { href: "/settings/telephony", label: "Telefonia", adminOnly: true },
  { href: "/settings/calendar", label: "Calendário", adminOnly: true },
];

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const visible = tabs.filter((t) => !t.adminOnly || session.role === "ADMIN");

  return (
    <>
      <PageHeader title="Configurações" description={`Workspace ${session.orgName}.`} />
      <div className="border-border border-b px-8">
        <nav className="-mb-px flex gap-6">
          {visible.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                "text-muted-foreground hover:text-foreground border-b-2 border-transparent px-1 py-3 text-sm font-medium transition-colors",
                "[&.active]:border-primary [&.active]:text-foreground",
              )}
            >
              {t.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="p-8">{children}</div>
    </>
  );
}
