"use client";

import { AlertTriangle, Loader2, Mail, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Result } from "@/lib/types/result";
import { formatRelativeTime } from "@/lib/utils";

import { changeRoleAction, removeMemberAction, revokeInviteAction } from "./actions";

const LAST_ADMIN_CODE = "last_admin";

type Role = "ADMIN" | "MEMBER";

interface MemberRow {
  id: string;
  userId: string;
  email: string;
  name: string | null;
  role: Role;
  currentUserId: string;
}

interface InviteRow {
  id: string;
  email: string;
  role: Role;
  createdAt: string;
}

export function MembersTable({
  memberships,
  invites,
  adminCount,
  locale,
}: {
  memberships: MemberRow[];
  invites: InviteRow[];
  adminCount: number;
  locale: string;
}) {
  const t = useTranslations("settings.members");
  const [lastAdminError, setLastAdminError] = useState(false);

  return (
    <div className="space-y-4">
      {lastAdminError ? (
        <Banner tone="destructive" icon={<AlertTriangle />}>
          {t("lastAdminBanner")}
        </Banner>
      ) : null}

      <Card title={t("title")} count={t("memberCount", { count: memberships.length })}>
        <div className="divide-border/60 divide-y">
          {memberships.map((m) => (
            <MemberRowItem
              key={m.id}
              member={m}
              isLastAdmin={m.role === "ADMIN" && adminCount <= 1}
              onLastAdminError={() => setLastAdminError(true)}
              onClearLastAdminError={() => setLastAdminError(false)}
            />
          ))}
        </div>
      </Card>

      {invites.length > 0 ? (
        <Card title={t("pendingTitle")} count={t("inviteCount", { count: invites.length })}>
          <div className="divide-border/60 divide-y">
            {invites.map((i) => (
              <InviteRowItem key={i.id} invite={i} locale={locale} />
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function Card({
  title,
  count,
  children,
}: {
  title: string;
  count: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-border bg-card overflow-hidden rounded-xl border shadow-sm">
      <div className="border-border/60 flex items-center justify-between border-b px-5 py-3">
        <span className="text-sm font-semibold">{title}</span>
        <span className="text-muted-foreground text-xs">{count}</span>
      </div>
      <div className="px-5">{children}</div>
    </div>
  );
}

function MemberRowItem({
  member,
  isLastAdmin,
  onLastAdminError,
  onClearLastAdminError,
}: {
  member: MemberRow;
  isLastAdmin: boolean;
  onLastAdminError: () => void;
  onClearLastAdminError: () => void;
}) {
  const t = useTranslations("settings.members.table");
  const tRole = useTranslations("enums.membershipRole");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [removeOpen, setRemoveOpen] = useState(false);

  const isSelf = member.userId === member.currentUserId;
  const displayName = member.name ?? member.email;
  const initials = displayName.slice(0, 2).toUpperCase();
  const removeDisabled = pending || isSelf || isLastAdmin;

  function handleResult(result: Result, successMessage: string) {
    if (result.ok) {
      onClearLastAdminError();
      toast.success(successMessage);
      router.refresh();
      return;
    }
    if (result.code === LAST_ADMIN_CODE) {
      onLastAdminError();
      return;
    }
    toast.error(result.error);
  }

  function changeRole(role: Role) {
    if (role === member.role) return;
    startTransition(async () => {
      const result = await changeRoleAction({ membershipId: member.id, role });
      handleResult(result, t("roleUpdated"));
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await removeMemberAction({ membershipId: member.id });
      if (result.ok) {
        setRemoveOpen(false);
      }
      handleResult(result, t("memberRemoved"));
    });
  }

  return (
    <div className="flex items-center gap-3 py-3">
      <Avatar className="size-9">
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">
          {displayName}
          {isSelf ? (
            <span className="text-muted-foreground ml-1 font-normal">({t("you")})</span>
          ) : null}
        </p>
        <p className="text-muted-foreground truncate text-xs">{member.email}</p>
      </div>

      <Select
        value={member.role}
        onValueChange={(v) => changeRole(v as Role)}
        disabled={pending || isSelf}
      >
        <SelectTrigger className="h-8 w-28 text-xs" aria-label={t("role")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ADMIN">{tRole("ADMIN")}</SelectItem>
          <SelectItem value="MEMBER">{tRole("MEMBER")}</SelectItem>
        </SelectContent>
      </Select>

      {isSelf ? null : isLastAdmin ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0}>
              <Button variant="ghost" size="icon-sm" disabled aria-label={t("remove")}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>{t("cannotRemoveLastAdmin")}</TooltipContent>
        </Tooltip>
      ) : (
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={removeDisabled}
          onClick={() => setRemoveOpen(true)}
          aria-label={t("remove")}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}

      <Dialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("removeTitle", { name: displayName })}</DialogTitle>
            <DialogDescription>{t("removeDescription")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveOpen(false)} disabled={pending}>
              {t("keepMember")}
            </Button>
            <Button variant="destructive" onClick={remove} disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t("removeMember")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InviteRowItem({ invite, locale }: { invite: InviteRow; locale: string }) {
  const t = useTranslations("settings.members.table");
  const tRole = useTranslations("enums.membershipRole");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function revoke() {
    startTransition(async () => {
      const result = await revokeInviteAction({ inviteId: invite.id });
      if (result.ok) {
        toast.success(t("inviteRevoked"));
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex items-center gap-3 py-3">
      <Avatar className="bg-secondary text-muted-foreground size-9">
        <AvatarFallback className="bg-transparent">
          <Mail className="size-4" aria-hidden />
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{invite.email}</p>
        <p className="text-muted-foreground text-xs">
          {t("invitedAgo", { ago: formatRelativeTime(new Date(invite.createdAt), locale) })}
        </p>
      </div>
      <span className="text-muted-foreground text-xs">{tRole(invite.role)}</span>
      <StatusBadge tone="warning" label={t("pendingStatus")} />
      <Button variant="ghost" size="sm" onClick={revoke} disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {t("revokeInvite")}
      </Button>
    </div>
  );
}
