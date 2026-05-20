"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { loginAction } from "./actions";

export function LoginForm({ next, initialError }: { next?: string; initialError?: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(initialError ?? null);

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await loginAction(formData);
      if (result.ok) {
        toast.success("Link de acesso enviado", {
          description: "Verifique seu email para entrar.",
        });
        if (next) {
          router.push(`/auth/check-email?email=${encodeURIComponent(email)}&next=${next}`);
        } else {
          router.push(`/auth/check-email?email=${encodeURIComponent(email)}`);
        }
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form
      action={onSubmit}
      className="space-y-4"
      onSubmit={() => {
        /* form action handles it */
      }}
    >
      <input type="hidden" name="next" value={next ?? ""} />
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          autoFocus
          placeholder="voce@empresa.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={pending}
        />
      </div>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar link de acesso"}
      </Button>
    </form>
  );
}
