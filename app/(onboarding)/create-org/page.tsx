import { redirect } from "next/navigation";

import { getPrisma } from "@/lib/db/client";
import { createServerSupabase } from "@/lib/supabase/server";

import { CreateOrgForm } from "./form";

export default async function CreateOrgPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // If user already has a membership, send them to the dashboard.
  const existing = await getPrisma().membership.findFirst({ where: { userId: user.id } });
  if (existing) redirect("/dashboard");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Crie sua organização</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Cada clínica, consultório ou prestador é uma organização. Você convida sua equipe depois.
        </p>
      </div>
      <CreateOrgForm />
    </div>
  );
}
