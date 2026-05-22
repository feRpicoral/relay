import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { getPrisma } from "@/lib/db/client";
import { createServerSupabase } from "@/lib/supabase/server";

import { AcceptInviteForm } from "./form";

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) redirect("/login");

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const invite = await getPrisma().invite.findUnique({
    where: { token },
    include: { organization: { select: { name: true } } },
  });

  const t = await getTranslations("onboarding.acceptInvite");

  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">{t("invalid.title")}</h1>
        <p className="text-muted-foreground text-sm">{t("invalid.description")}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("anonymous.title", { orgName: invite.organization.name })}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {t.rich("anonymous.description", {
              email: invite.email,
              strong: (chunks) => <strong>{chunks}</strong>,
            })}
          </p>
        </div>
        <a
          href={`/login?next=${encodeURIComponent(`/accept-invite?token=${token}`)}`}
          className="bg-primary text-primary-foreground inline-flex items-center rounded-md px-4 py-2 text-sm font-medium"
        >
          {t("anonymous.signInWith", { email: invite.email })}
        </a>
      </div>
    );
  }

  if (user.email?.toLowerCase() !== invite.email.toLowerCase()) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">{t("emailMismatch.title")}</h1>
        <p className="text-muted-foreground text-sm">
          {t.rich("emailMismatch.description", {
            inviteEmail: invite.email,
            currentEmail: user.email ?? "",
            strong: (chunks) => <strong>{chunks}</strong>,
          })}
        </p>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="border-border hover:bg-accent rounded-md border px-4 py-2 text-sm"
          >
            {t("emailMismatch.signOutAndRetry")}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("valid.title", { orgName: invite.organization.name })}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          {t.rich("valid.description", {
            role: invite.role.toLowerCase(),
            strong: (chunks) => <strong>{chunks}</strong>,
          })}
        </p>
      </div>
      <AcceptInviteForm token={token} />
    </div>
  );
}
