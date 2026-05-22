import { getTranslations } from "next-intl/server";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fromPrismaLocale } from "@/i18n/config";
import { requireSession } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db/client";

import { LocaleSelect } from "./locale-select";

export default async function PreferencesPage() {
  const session = await requireSession();
  const t = await getTranslations("settings.preferences");

  const user = await getPrisma().user.findUniqueOrThrow({
    where: { id: session.userId },
    select: { locale: true },
  });

  return (
    <div className="max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <LocaleSelect initialLocale={fromPrismaLocale(user.locale)} />
        </CardContent>
      </Card>
    </div>
  );
}
