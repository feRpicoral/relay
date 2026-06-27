import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { safeNextPath } from "@/lib/auth/safe-redirect";

import { LoginForm } from "./form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("login");
  return { title: t("metadataTitle") };
}

type LoginErrorCode = "auth_failed" | "missing_code";

const KNOWN_ERROR_CODES = new Set<LoginErrorCode>(["auth_failed", "missing_code"]);

function isKnownErrorCode(value: string): value is LoginErrorCode {
  return KNOWN_ERROR_CODES.has(value as LoginErrorCode);
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = safeNextPath(params.next) ?? undefined;
  const t = await getTranslations("login");
  const tErrors = await getTranslations("login.errors");
  // Only surface error codes we recognize; never render attacker-controlled
  // strings from the query param.
  const linkError =
    params.error && isKnownErrorCode(params.error) ? tErrors(params.error) : undefined;

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="text-muted-foreground mt-1.5 mb-6 text-sm">{t("description")}</p>
      <LoginForm next={next} linkError={linkError} />
      <p className="text-muted-foreground mt-[18px] text-center text-[12.5px]">
        {t("noAccountPrompt")}{" "}
        <Link href="/signup" className="text-primary font-medium hover:underline">
          {t("createAccount")}
        </Link>
      </p>
    </div>
  );
}
