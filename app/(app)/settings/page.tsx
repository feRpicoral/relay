import { getTranslations } from "next-intl/server";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireSession } from "@/lib/auth/session";

export default async function OrgSettingsPage() {
  const session = await requireSession();
  const t = await getTranslations("settings.organization");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="org-name">{t("nameLabel")}</Label>
          <Input id="org-name" defaultValue={session.orgName} disabled />
        </div>
        <div className="space-y-2">
          <Label htmlFor="org-slug">{t("slugLabel")}</Label>
          <Input id="org-slug" defaultValue={session.orgSlug} disabled />
        </div>
      </CardContent>
    </Card>
  );
}
