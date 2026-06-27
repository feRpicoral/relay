import { Card, CardContent } from "@/components/ui/card";
import { fromPrismaLocale } from "@/i18n/config";
import { requireSession } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db/client";

import { LocaleSelect } from "./locale-select";

export default async function PreferencesPage() {
  const session = await requireSession();

  const user = await getPrisma().user.findUniqueOrThrow({
    where: { id: session.userId },
    select: { locale: true },
  });

  return (
    <div className="max-w-3xl">
      <Card>
        <CardContent className="pt-6">
          <LocaleSelect initialLocale={fromPrismaLocale(user.locale)} />
        </CardContent>
      </Card>
    </div>
  );
}
