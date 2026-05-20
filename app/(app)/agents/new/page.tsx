import { redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { requireSession } from "@/lib/auth/session";

import { NewAgentForm } from "./form";

export default async function NewAgentPage() {
  const session = await requireSession();
  if (session.role !== "ADMIN") redirect("/agents");

  return (
    <>
      <PageHeader
        title="Novo agente"
        description="Comece com defaults sensatos, você ajusta tudo depois."
      />
      <div className="p-8">
        <Card className="p-6">
          <NewAgentForm />
        </Card>
      </div>
    </>
  );
}
