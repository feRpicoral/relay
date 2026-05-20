"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { connectCalcomAction } from "./actions";

export function ConnectForm() {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [accessToken, setAccessToken] = useState("");
  const [refreshToken, setRefreshToken] = useState("");
  const [managedUserEmail, setManagedUserEmail] = useState("");
  const [calcomUserId, setCalcomUserId] = useState("");

  function onConnect() {
    startTransition(async () => {
      const result = await connectCalcomAction({
        accessToken,
        refreshToken,
        managedUserEmail,
        calcomUserId: parseInt(calcomUserId, 10),
      });
      if (result.ok) {
        toast.success("Cal.com conectado");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Conectar Cal.com</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Conectar Cal.com</DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground text-sm">
          No painel Cal.com Platform, crie um managed user e cole os tokens aqui. Vamos mover isso
          pra OAuth proper quando você sair do MVP.
        </p>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="cu-email">Email do managed user</Label>
            <Input
              id="cu-email"
              value={managedUserEmail}
              onChange={(e) => setManagedUserEmail(e.target.value)}
              placeholder="org+relay@example.com"
              disabled={pending}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cu-id">Cal.com user id</Label>
            <Input
              id="cu-id"
              value={calcomUserId}
              onChange={(e) => setCalcomUserId(e.target.value)}
              type="number"
              disabled={pending}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cu-access">Access token</Label>
            <Input
              id="cu-access"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              type="password"
              disabled={pending}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cu-refresh">Refresh token</Label>
            <Input
              id="cu-refresh"
              value={refreshToken}
              onChange={(e) => setRefreshToken(e.target.value)}
              type="password"
              disabled={pending}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button onClick={onConnect} disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Conectar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
