"use client";

import { Loader2, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Result } from "@/lib/types/result";

import { inviteMemberAction } from "./actions";

export function InviteMemberForm() {
  const t = useTranslations("settings.members.invite");
  const tRole = useTranslations("enums.membershipRole");
  const router = useRouter();
  const [role, setRole] = useState<"ADMIN" | "MEMBER">("MEMBER");

  const [state, formAction, pending] = useActionState<Result | null, FormData>(
    async (_prev, formData) => {
      const email = String(formData.get("email") ?? "").trim();
      return inviteMemberAction({ email, role });
    },
    null,
  );

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(t("toastSent"));
      router.refresh();
    } else {
      toast.error(state.error);
    }
  }, [state, router, t]);

  const resetKey = state && state.ok ? 1 : 0;

  return (
    <Card>
      <CardContent className="pt-5">
        <Label htmlFor="invite-email" className="mb-2.5 block">
          {t("title")}
        </Label>
        <form action={formAction} className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <Input
            key={resetKey}
            id="invite-email"
            name="email"
            type="email"
            placeholder={t("emailPlaceholder")}
            defaultValue=""
            required
            disabled={pending}
            className="sm:flex-1"
          />
          <Select
            value={role}
            onValueChange={(v) => setRole(v as "ADMIN" | "MEMBER")}
            disabled={pending}
          >
            <SelectTrigger id="invite-role" className="sm:w-36" aria-label={t("roleLabel")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MEMBER">{tRole("MEMBER")}</SelectItem>
              <SelectItem value="ADMIN">{tRole("ADMIN")}</SelectItem>
            </SelectContent>
          </Select>
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {t("submit")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
