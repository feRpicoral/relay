import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/session";

import { NewAgentForm } from "./form";

export default async function NewAgentPage() {
  await requireAdmin();

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
