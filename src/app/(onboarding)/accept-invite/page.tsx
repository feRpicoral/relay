import { AlertTriangle, Mail, User } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StateCard } from "@/components/ui/state-card";
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
    include: {
      organization: { select: { name: true } },
      createdBy: { select: { name: true } },
    },
  });

  const t = await getTranslations("onboarding.acceptInvite");
  const tRole = await getTranslations("enums.membershipRole");

  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
    const orgName = invite?.organization.name;
    return (
      <StateCard
        icon={<AlertTriangle />}
        iconTone="destructive"
        title={t("expired.title")}
        description={
          orgName ? t("expired.descriptionWithOrg", { orgName }) : t("expired.description")
        }
        actions={
          <Button asChild variant="outline">
            <Link href="/login">{t("expired.backToLogin")}</Link>
          </Button>
        }
      />
    );
  }

  if (!user) {
    const loginHref = `/login?next=${encodeURIComponent(`/accept-invite?token=${token}`)}`;
    return (
      <StateCard
        icon={<Mail />}
        iconTone="primary"
        title={t("anonymous.title")}
        description={t.rich("anonymous.description", {
          email: invite.email,
          orgName: invite.organization.name,
          strong: (chunks) => <strong className="text-foreground font-semibold">{chunks}</strong>,
        })}
        actions={
          <Button asChild className="gap-2">
            <Link href={loginHref}>
              <Mail className="size-4" />
              {t("anonymous.signIn")}
            </Link>
          </Button>
        }
      />
    );
  }

  if (user.email?.toLowerCase() !== invite.email.toLowerCase()) {
    return (
      <StateCard
        icon={<User />}
        iconTone="warning"
        title={t("emailMismatch.title")}
        description={t.rich("emailMismatch.description", {
          inviteEmail: invite.email,
          currentEmail: user.email ?? "",
          strong: (chunks) => <strong className="text-foreground font-semibold">{chunks}</strong>,
        })}
        actions={
          <form action="/auth/signout" method="post">
            <Button type="submit" variant="outline">
              {t("emailMismatch.signOutAndSwitch")}
            </Button>
          </form>
        }
      />
    );
  }

  const orgName = invite.organization.name;
  const inviterName = invite.createdBy.name ?? "";
  const roleLabel = tRole(invite.role);
  const initials = orgName.slice(0, 2).toUpperCase();

  return (
    <Card className="w-full max-w-[420px] p-7 text-center">
      <Avatar className="bg-primary/15 mx-auto mb-4 size-12">
        <AvatarFallback className="text-primary bg-transparent text-base font-semibold">
          {initials}
        </AvatarFallback>
      </Avatar>
      <h1 className="text-xl font-semibold tracking-tight">{t("valid.title", { orgName })}</h1>
      <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
        {t.rich("valid.description", {
          inviter: inviterName,
          role: roleLabel,
          strong: (chunks) => <strong className="text-foreground font-semibold">{chunks}</strong>,
        })}
      </p>
      <AcceptInviteForm token={token} />
    </Card>
  );
}
