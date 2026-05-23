import { Mail } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  const t = await getTranslations("checkEmail");
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="bg-primary/10 text-primary mx-auto flex h-12 w-12 items-center justify-center rounded-full">
          <Mail className="h-5 w-5" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground text-sm">
            {t("descriptionHead")}
            {email ? <span className="text-foreground ml-1 font-medium">{email}</span> : ""}
            {t("descriptionTail")}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/login">{t("backToLogin")}</Link>
        </Button>
      </div>
    </div>
  );
}
