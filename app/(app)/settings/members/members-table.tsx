"use client";

import { MoreHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
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
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handle(fn: () => Promise<{ ok: true } | { ok: false; error: string }>, success: string) {
    startTransition(async () => {
      const result = await fn();
      if (result.ok) {
        toast.success(success);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Membros</CardTitle>
        </CardHeader>
        <div className="divide-border divide-y">
          {memberships.map((m) => {
            const isSelf = m.userId === m.currentUserId;
            const initials = (m.name ?? m.email).slice(0, 2).toUpperCase();
            return (
              <div key={m.id} className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">
                      {m.name ?? m.email}{" "}
                      {isSelf ? <span className="text-muted-foreground ml-1">(você)</span> : null}
                    </p>
                    <p className="text-muted-foreground text-xs">{m.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={m.role === "ADMIN" ? "default" : "secondary"}>
                    {m.role === "ADMIN" ? "Admin" : "Membro"}
                  </Badge>
                  {!isSelf ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" disabled={pending}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            handle(
                              () =>
                                changeRoleAction({
                                  membershipId: m.id,
                                  role: m.role === "ADMIN" ? "MEMBER" : "ADMIN",
                                }),
                              "Papel atualizado",
                            )
                          }
                        >
                          {m.role === "ADMIN" ? "Tornar Membro" : "Tornar Admin"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() =>
                            handle(
                              () => removeMemberAction({ membershipId: m.id }),
                              "Membro removido",
                            )
                          }
                        >
                          Remover
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {invites.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Convites pendentes</CardTitle>
          </CardHeader>
          <div className="divide-border divide-y">
            {invites.map((i) => (
              <div key={i.id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="text-sm font-medium">{i.email}</p>
                  <p className="text-muted-foreground text-xs">
                    Convidado como {i.role === "ADMIN" ? "Admin" : "Membro"} · expira{" "}
                    {new Date(i.expiresAt).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    handle(() => revokeInviteAction({ inviteId: i.id }), "Convite revogado")
                  }
                  disabled={pending}
                >
                  Revogar
                </Button>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
