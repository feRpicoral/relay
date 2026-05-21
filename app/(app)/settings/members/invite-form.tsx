"use client";

import { Loader2, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { inviteMemberAction } from "./actions";

export function InviteMemberForm() {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "MEMBER">("MEMBER");

  function onSubmit() {
    startTransition(async () => {
      const result = await inviteMemberAction({ email, role });
      if (result.ok) {
        toast.success("Convite enviado", { description: email });
        setEmail("");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Convidar membro</CardTitle>
        <CardDescription>Envie um link de convite por email. Expira em 7 dias.</CardDescription>
      </CardHeader>
      <CardContent>
        {/*
          CSS grid gives a single, deterministic row alignment instead of
          flex+items-end (which floated the labels at different Y heights
          because the bare Button has no label sibling).
        */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_10rem_auto] md:items-end">
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="colega@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={pending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-role">Papel</Label>
            <Select
              value={role}
              onValueChange={(v) => setRole(v as "ADMIN" | "MEMBER")}
              disabled={pending}
            >
              <SelectTrigger id="invite-role" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MEMBER">Membro</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={onSubmit} disabled={pending || !email}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Enviar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
