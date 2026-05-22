"use client";

import { Loader2, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useState } from "react";
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

  // Derive the input's remount key from the action state: every successful
  // submit produces a new state reference, so the input resets to "" without
  // setState-in-effect (banned by React 19's lint rule).
  const resetKey = state && state.ok ? 1 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          action={formAction}
          className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_10rem_auto] md:items-end"
        >
          <div className="space-y-2">
            <Label htmlFor="invite-email">{t("emailLabel")}</Label>
            <Input
              key={resetKey}
              id="invite-email"
              name="email"
              type="email"
              placeholder={t("emailPlaceholder")}
              defaultValue=""
              required
              disabled={pending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-role">{t("roleLabel")}</Label>
            <Select
              value={role}
              onValueChange={(v) => setRole(v as "ADMIN" | "MEMBER")}
              disabled={pending}
            >
              <SelectTrigger id="invite-role" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MEMBER">{tRole("MEMBER")}</SelectItem>
                <SelectItem value="ADMIN">{tRole("ADMIN")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {t("submit")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
