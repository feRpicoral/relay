import { ChevronLeft, Lock } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { StateCard } from "@/components/ui/state-card";
import { requireSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/with-org";

import { NewAgentForm } from "./form";

export default async function NewAgentPage() {
  const session = await requireSession();
  const t = await getTranslations("agents.new");

  const header = (
    <div className="border-border flex items-center gap-3 border-b px-6 py-4 md:px-8">
      <Button asChild variant="outline" size="icon-sm" className="shrink-0">
        <Link href="/agents" aria-label={t("back")}>
          <ChevronLeft className="size-4" />
        </Link>
      </Button>
      <div className="min-w-0">
        <h1 className="text-foreground text-lg font-semibold">{t("title")}</h1>
        <p className="text-muted-foreground mt-0.5 text-xs">
          {t("subtitle", { orgName: session.orgName })}
        </p>
      </div>
    </div>
  );

  if (session.role !== "ADMIN") {
    return (
      <>
        {header}
        <div className="flex flex-1 items-center justify-center p-8">
          <StateCard
            icon={<Lock />}
            title={t("adminOnly.title")}
            description={t("adminOnly.description")}
            actions={
              <Button asChild variant="outline" size="lg">
                <Link href="/agents">
                  <ChevronLeft className="size-4" />
                  {t("adminOnly.back")}
                </Link>
              </Button>
            }
          />
        </div>
      </>
    );
  }

  const db = getDb(session.orgId);
  const org = await db.organization.findUniqueOrThrow({
    where: { id: session.orgId },
    select: { defaultAgentLanguage: true },
  });
  const defaultLanguage = org.defaultAgentLanguage === "EN_US" ? "EN_US" : "PT_BR";

  return (
    <>
      {header}
      <div className="flex flex-1 justify-center overflow-y-auto p-6 md:p-8">
        <div className="w-full max-w-xl">
          <NewAgentForm defaultLanguage={defaultLanguage} />
        </div>
      </div>
    </>
  );
}
