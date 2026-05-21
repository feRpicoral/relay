"use client";

import { MoreHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { changeRoleAction, removeMemberAction, revokeInviteAction } from "./actions";

interface MemberRow {
  id: string;
  userId: string;
  email: string;
  name: string | null;
  role: "ADMIN" | "MEMBER";
  currentUserId: string;
}

interface InviteRow {
  id: string;
  email: string;
  role: "ADMIN" | "MEMBER";
  expiresAt: string;
}

export function MembersTable({
  memberships,
  invites,
}: {
  memberships: MemberRow[];
  invites: InviteRow[];
}) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Membros</CardTitle>
        </CardHeader>
        <div className="divide-border divide-y">
          {memberships.map((m) => (
            <MemberRowItem key={m.id} member={m} />
          ))}
        </div>
      </Card>

      {invites.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Convites pendentes</CardTitle>
          </CardHeader>
          <div className="divide-border divide-y">
            {invites.map((i) => (
              <InviteRowItem key={i.id} invite={i} />
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function MemberRowItem({ member }: { member: MemberRow }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [removeOpen, setRemoveOpen] = useState(false);

  const isSelf = member.userId === member.currentUserId;
  const initials = (member.name ?? member.email).slice(0, 2).toUpperCase();

  function changeRole() {
    startTransition(async () => {
      const result = await changeRoleAction({
        membershipId: member.id,
        role: member.role === "ADMIN" ? "MEMBER" : "ADMIN",
      });
      if (result.ok) {
        toast.success("Papel atualizado");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await removeMemberAction({ membershipId: member.id });
      if (result.ok) {
        toast.success("Membro removido");
        setRemoveOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex items-center justify-between px-6 py-4">
      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm font-medium">
            {member.name ?? member.email}{" "}
            {isSelf ? <span className="text-muted-foreground ml-1">(você)</span> : null}
          </p>
          <p className="text-muted-foreground text-xs">{member.email}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Badge variant={member.role === "ADMIN" ? "default" : "secondary"}>
          {member.role === "ADMIN" ? "Admin" : "Membro"}
        </Badge>
        {!isSelf ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" disabled={pending}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={changeRole}>
                {member.role === "ADMIN" ? "Tornar Membro" : "Tornar Admin"}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={(e) => {
                  // Prevent the menu close from cancelling the dialog open.
                  e.preventDefault();
                  setRemoveOpen(true);
                }}
              >
                Remover
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
      <Dialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Remover membro?</DialogTitle>
            <DialogDescription>
              {member.name ?? member.email} perderá acesso imediatamente. Para reentrar, precisará
              de um novo convite.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRemoveOpen(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={remove} disabled={pending}>
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InviteRowItem({ invite }: { invite: InviteRow }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [revokeOpen, setRevokeOpen] = useState(false);

  function revoke() {
    startTransition(async () => {
      const result = await revokeInviteAction({ inviteId: invite.id });
      if (result.ok) {
        toast.success("Convite revogado");
        setRevokeOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex items-center justify-between px-6 py-4">
      <div>
        <p className="text-sm font-medium">{invite.email}</p>
        <p className="text-muted-foreground text-xs">
          Convidado como {invite.role === "ADMIN" ? "Admin" : "Membro"}, expira{" "}
          {new Date(invite.expiresAt).toLocaleDateString("pt-BR")}
        </p>
      </div>
      <Dialog open={revokeOpen} onOpenChange={setRevokeOpen}>
        <Button variant="ghost" size="sm" onClick={() => setRevokeOpen(true)} disabled={pending}>
          Revogar
        </Button>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Revogar convite?</DialogTitle>
            <DialogDescription>
              O link enviado para {invite.email} deixará de funcionar. Você pode reenviar depois.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRevokeOpen(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={revoke} disabled={pending}>
              Revogar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
