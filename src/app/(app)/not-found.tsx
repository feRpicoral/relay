import { Compass } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { StateCard } from "@/components/ui/state-card";

export default async function AppNotFound() {
  const t = await getTranslations("errors.notFound");

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <StateCard
        icon={<Compass />}
        iconTone="primary"
        title={t("title")}
        description={t("description")}
        actions={
          <Button asChild>
            <Link href="/overview">{t("backHome")}</Link>
          </Button>
        }
      />
    </div>
  );
}
