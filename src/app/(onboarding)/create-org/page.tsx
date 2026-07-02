import { Building2 } from "lucide-react";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
    <Card className="w-full max-w-[420px] p-7">
      <div className="bg-primary/15 text-primary border-primary/30 mb-4 flex size-13 items-center justify-center rounded-[13px] border [&_svg]:size-[22px]">
        <Building2 />
      </div>
      <h1 className="text-xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="text-muted-foreground mt-1.5 mb-5 text-sm">{t("description")}</p>
      <CreateOrgForm />
      <form action="/auth/signout" method="post" className="mt-3">
        <Button type="submit" variant="ghost" className="w-full">
          {t("signOut")}
        </Button>
      </form>
    </Card>
  );
}
