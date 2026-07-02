import type { AgentLanguage } from "@prisma/client";
import { Bot, Mic, Settings2 } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { agentSetupState, agentSetupTone } from "@/components/agents/agent-status";
import { RosterTestButton } from "@/components/agents/roster-test-button";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatPhone } from "@/lib/utils";

export interface AgentCardData {
  id: string;
  name: string;
  language: AgentLanguage;
  voiceId: string;
  enabled: boolean;
  callCount: number;
  docCount: number;
  phoneNumbers: string[];
}

export async function AgentCard({ agent }: { agent: AgentCardData }) {
  const t = await getTranslations("agents.list");
  const state = agentSetupState({
    voiceId: agent.voiceId,
    enabled: agent.enabled,
    phoneNumberCount: agent.phoneNumbers.length,
  });
  const statusLabel = t(`status.${state === "setup" ? "needsSetup" : state}`);
  const primaryNumber = agent.phoneNumbers[0];

  return (
    <div
      className={`bg-card flex flex-col overflow-hidden rounded-xl border ${
        state === "setup" ? "border-warning/40" : "border-border"
      }`}
    >
      <div className="flex items-start gap-3 p-4 pb-3">
        <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
          <Bot className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <span className="text-foreground truncate font-semibold">{agent.name}</span>
            <StatusBadge label={statusLabel} tone={agentSetupTone[state]} />
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className="border-border bg-card text-muted-foreground inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium">
              {t(`languageCode.${agent.language}`)}
            </span>
            {primaryNumber ? (
              <span className="text-muted-foreground font-mono text-xs">
                {formatPhone(primaryNumber)}
              </span>
            ) : (
              <span className="text-muted-foreground text-xs">{t("noNumber")}</span>
            )}
          </div>
        </div>
      </div>
      <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 px-4 pb-3 text-xs">
        <span>{t("callsMetric", { count: agent.callCount })}</span>
        <span>{t("docsMetric", { count: agent.docCount })}</span>
      </div>
      <div className="border-border mt-auto flex gap-2 border-t p-3">
        {state === "setup" ? (
          <>
            <Button asChild size="sm" className="flex-1">
              <Link href={`/agents/${agent.id}`}>
                <Mic className="size-3.5" />
                {t("addVoice")}
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/agents/${agent.id}`}>{t("configure")}</Link>
            </Button>
          </>
        ) : (
          <>
            <Button asChild variant="outline" size="sm" className="flex-1">
              <Link href={`/agents/${agent.id}`}>
                <Settings2 className="size-3.5" />
                {t("configure")}
              </Link>
            </Button>
            <RosterTestButton agentId={agent.id} />
          </>
        )}
      </div>
    </div>
  );
}
