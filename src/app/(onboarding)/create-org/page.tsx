import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { getPrisma } from "@/lib/db/client";
import { createServerSupabase } from "@/lib/supabase/server";

import { CreateOrgForm } from "./form";

export default async function CreateOrgPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const existing = await getPrisma().membership.findFirst({ where: { userId: user.id } });
  if (existing) redirect("/overview");

  const t = await getTranslations("onboarding.createOrg");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground mt-2 text-sm">{t("description")}</p>
      </div>
      <CreateOrgForm />
    </div>
  );
}
