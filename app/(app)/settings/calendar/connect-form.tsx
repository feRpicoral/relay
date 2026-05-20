"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { connectCalcomAction } from "./actions";

export function ConnectForm() {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function onConnect() {
    startTransition(async () => {
      const result = await connectCalcomAction();
      if (result.ok) {
        toast.success("Cal.com conectado");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Button onClick={onConnect} disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Conectar Cal.com"}
    </Button>
  );
}
