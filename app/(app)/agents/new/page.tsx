import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/session";

import { NewAgentForm } from "./form";

export default async function NewAgentPage() {
  await requireAdmin();
  const t = await getTranslations("agents.new");

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <div className="p-8">
        <Card className="p-6">
          <NewAgentForm />
        </Card>
      </div>
    </>
  );
}
