"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { createOrgAction } from "./actions";

export function CreateOrgForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createOrgAction(formData);
      if (result.ok) {
        toast.success("Organização criada");
        // No router.refresh() here: it would re-render the current (create-org)
        // page during transition, which the user is about to leave anyway, and
        // useTransition would keep the spinner active until that refetch
        // finished. push() alone runs the RSC for /dashboard once.
        router.push("/dashboard");
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome da organização</Label>
        <Input
          id="name"
          name="name"
          placeholder="Ex: Clínica Lumen"
          autoFocus
          required
          disabled={pending}
        />
      </div>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar organização"}
      </Button>
    </form>
  );
}
