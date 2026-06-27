"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function NewAgentButton({ canCreate }: { canCreate: boolean }) {
  const t = useTranslations("agents.list");

  if (!canCreate) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0}>
            <Button disabled>
              <Plus className="size-4" />
              {t("newAgent")}
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>{t("member.adminsOnly")}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Button asChild>
      <Link href="/agents/new">
        <Plus className="size-4" />
        {t("newAgent")}
      </Link>
    </Button>
  );
}
