"use client";

import { Loader2, Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";

import { startTestCallAction } from "@/app/(app)/agents/[id]/test-actions";
import { Button } from "@/components/ui/button";

export function RosterTestButton({ agentId }: { agentId: string }) {
  const t = useTranslations("agents.list");
  const tTest = useTranslations("agents.detail.testCall");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function onClick() {
    startTransition(async () => {
      const result = await startTestCallAction({ agentId });
      if (result.ok) {
        toast.success(tTest("toastStarted"), { description: tTest("toastOpening") });
        router.push(`/calls/${result.callId}/live`);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Button variant="ghost" size="sm" onClick={onClick} disabled={pending}>
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
      {t("test")}
    </Button>
  );
}
