"use client";

import { Check, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { VoiceOption } from "@/lib/voice/cartesia-voices";

import { updateAgentVoiceAction } from "./actions";

export function VoicePicker({
  agentId,
  language,
  currentVoiceId,
  currentProvider,
  voices,
}: {
  agentId: string;
  language: "PT_BR" | "EN_US" | "AUTO";
  currentVoiceId: string;
  currentProvider: "CARTESIA" | "ELEVENLABS";
  voices: readonly VoiceOption[];
}) {
  const t = useTranslations("agents.detail.voice");
  const tGender = useTranslations("enums.voiceGender");
  const langFilter: "pt-BR" | "en-US" = language === "EN_US" ? "en-US" : "pt-BR";
  const candidates = voices.filter((v) => v.language === langFilter);

  const [pending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState(currentVoiceId);
  const [selectedProvider, setSelectedProvider] = useState<"CARTESIA" | "ELEVENLABS">(
    currentProvider,
  );
  const router = useRouter();

  function pick(voice: VoiceOption) {
    setSelectedId(voice.voiceId);
    setSelectedProvider(voice.provider === "elevenlabs" ? "ELEVENLABS" : "CARTESIA");
    startTransition(async () => {
      const result = await updateAgentVoiceAction({
        agentId,
        voiceId: voice.voiceId,
        ttsProvider: voice.provider === "elevenlabs" ? "ELEVENLABS" : "CARTESIA",
      });
      if (result.ok) {
        toast.success(t("toastChanged", { label: voice.label }));
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  const elevenlabsEnabled = voices.some((v) => v.provider === "elevenlabs");

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-sm font-medium">{t("title")}</p>
        <p className="text-muted-foreground text-xs">
          {elevenlabsEnabled ? t("hintWithElevenlabs") : t("hintCartesiaOnly")}
        </p>
      </div>
      <div className="grid gap-2">
        {candidates.map((voice) => {
          const isSelected =
            voice.voiceId === selectedId &&
            (voice.provider === "elevenlabs" ? "ELEVENLABS" : "CARTESIA") === selectedProvider;
          return (
            <button
              key={voice.voiceId}
              type="button"
              onClick={() => pick(voice)}
              disabled={pending}
              className={cn(
                "border-border bg-card/40 hover:border-primary/40 flex items-center justify-between rounded-lg border px-4 py-3 text-left transition-all",
                isSelected && "border-primary bg-primary/5",
              )}
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{voice.label}</p>
                  {voice.provider === "elevenlabs" ? (
                    <Badge variant="outline" className="border-warning/40 text-warning gap-1">
                      <Sparkles className="h-3 w-3" />
                      {t("premium")}
                    </Badge>
                  ) : null}
                  <Badge variant="secondary" className="text-[10px] uppercase">
                    {tGender(voice.gender)}
                  </Badge>
                </div>
                {voice.description ? (
                  <p className="text-muted-foreground mt-0.5 text-xs">{voice.description}</p>
                ) : null}
              </div>
              {isSelected ? <Check className="text-primary h-4 w-4" /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
