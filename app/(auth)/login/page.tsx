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
  // Avoid rendering arbitrary attacker-controlled error strings on the
  // login page — only translate codes we recognize.
  const initialError =
    params.error && isKnownErrorCode(params.error) ? tErrors(params.error) : undefined;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">{t("description")}</p>
      </div>
      <LoginForm next={next} initialError={initialError} />
      <p className="text-muted-foreground text-center text-sm">
        {t("noAccountPrompt")}{" "}
        <Link href="/signup" className="text-foreground underline-offset-4 hover:underline">
          {t("createAccount")}
        </Link>
      </p>
    </div>
  );
}
