"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { BusinessHours, BusinessHoursDay } from "@/lib/voice/types";

import { updateBusinessHoursAction } from "./actions";

type DayKey = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

const DAY_KEYS: DayKey[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export function BusinessHoursForm({
  agentId,
  initial,
}: {
  agentId: string;
  initial: BusinessHours;
}) {
  const t = useTranslations("agents.detail.hours");
  const tDays = useTranslations("enums.dayOfWeek");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const [hours, setHours] = useState<BusinessHours>({
    timezone: initial.timezone ?? "America/Sao_Paulo",
    monday: initial.monday ?? null,
    tuesday: initial.tuesday ?? null,
    wednesday: initial.wednesday ?? null,
    thursday: initial.thursday ?? null,
    friday: initial.friday ?? null,
    saturday: initial.saturday ?? null,
    sunday: initial.sunday ?? null,
  });

  function toggleDay(key: keyof BusinessHours, on: boolean) {
    setHours((h) => ({
      ...h,
      [key]: on ? ({ open: "08:00", close: "18:00" } satisfies BusinessHoursDay) : null,
    }));
  }

  function setRange(key: keyof BusinessHours, edge: "open" | "close", value: string) {
    setHours((h) => {
      const current = h[key];
      if (!current || typeof current !== "object" || !("open" in current)) return h;
      return { ...h, [key]: { ...current, [edge]: value } };
    });
  }

  function onSubmit() {
    startTransition(async () => {
      const result = await updateBusinessHoursAction({ agentId, hours });
      if (result.ok) {
        toast.success(t("toastSaved"));
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="tz">{t("timezoneLabel")}</Label>
        <Input
          id="tz"
          value={hours.timezone}
          onChange={(e) => setHours((h) => ({ ...h, timezone: e.target.value }))}
          disabled={pending}
        />
      </div>
      <div className="space-y-2">
        {DAY_KEYS.map((key) => {
          const day = hours[key];
          const isOpen = day && typeof day === "object" && "open" in day;
          return (
            <div
              key={key}
              className="border-border bg-card/40 flex items-center gap-3 rounded-md border px-4 py-2.5"
            >
              <div className="w-40">
                <p className="text-sm font-medium">{tDays(key)}</p>
              </div>
              <Switch
                checked={Boolean(isOpen)}
                onCheckedChange={(v) => toggleDay(key, v)}
                disabled={pending}
              />
              {isOpen ? (
                <div className="flex items-center gap-2 text-sm">
                  <Input
                    type="time"
                    value={(day as BusinessHoursDay).open}
                    onChange={(e) => setRange(key, "open", e.target.value)}
                    className="w-28"
                    disabled={pending}
                  />
                  <span className="text-muted-foreground">{t("to")}</span>
                  <Input
                    type="time"
                    value={(day as BusinessHoursDay).close}
                    onChange={(e) => setRange(key, "close", e.target.value)}
                    className="w-28"
                    disabled={pending}
                  />
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">{t("closed")}</p>
              )}
            </div>
          );
        })}
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("submit")}
      </Button>
    </form>
  );
}
