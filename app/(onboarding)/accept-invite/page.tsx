import { redirect } from "next/navigation";

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

  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Convite inválido</h1>
        <p className="text-muted-foreground text-sm">
          Esse link já expirou ou foi usado. Peça um novo convite pra quem te chamou.
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Você foi convidado pra {invite.organization.name}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Primeiro entre com o email <strong>{invite.email}</strong> pra aceitar.
          </p>
        </div>
        <a
          href={`/login?next=${encodeURIComponent(`/accept-invite?token=${token}`)}`}
          className="bg-primary text-primary-foreground inline-flex items-center rounded-md px-4 py-2 text-sm font-medium"
        >
          Entrar com {invite.email}
        </a>
      </div>
    );
  }

  if (user.email?.toLowerCase() !== invite.email.toLowerCase()) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Email não bate</h1>
        <p className="text-muted-foreground text-sm">
          Esse convite é pra <strong>{invite.email}</strong>, mas você está logado como{" "}
          <strong>{user.email}</strong>.
        </p>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="border-border hover:bg-accent rounded-md border px-4 py-2 text-sm"
          >
            Sair e entrar com o email correto
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Entrar em {invite.organization.name}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Você foi convidado como <strong>{invite.role.toLowerCase()}</strong>.
        </p>
      </div>
      <AcceptInviteForm token={token} />
    </div>
  );
}
