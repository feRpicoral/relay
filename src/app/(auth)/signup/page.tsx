import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { SignupForm } from "./form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("signup");
  return { title: t("metadataTitle") };
}

export default async function SignupPage() {
  const t = await getTranslations("signup");
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="text-muted-foreground mt-1.5 mb-6 text-sm">{t("description")}</p>
      <SignupForm />
      <p className="text-muted-foreground mt-[18px] text-center text-[12.5px]">
        {t("haveAccount")}{" "}
        <Link href="/login" className="text-primary font-medium hover:underline">
          {t("signIn")}
        </Link>
      </p>
    </div>
  );
}
