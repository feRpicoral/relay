"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type Locale, locales } from "@/i18n/config";
import type { Result } from "@/lib/types/result";

import { setLocalePreferenceAction } from "./actions";

export function LocaleSelect({ initialLocale }: { initialLocale: Locale }) {
  const router = useRouter();
  const t = useTranslations("settings.preferences");
  const tLocale = useTranslations("settings.preferences.localeOption");

  const [locale, setLocale] = useState<Locale>(initialLocale);

  const [state, formAction, pending] = useActionState<Result | null>(
    async () => setLocalePreferenceAction({ locale }),
    null,
  );

  // Dedupe so `router.refresh()` (which rebuilds server messages and re-fires
  // this effect with the same `state`) doesn't loop the refresh/toast.
  const handledStateRef = useRef<Result | null>(null);

  useEffect(() => {
    if (!state || handledStateRef.current === state) return;
    handledStateRef.current = state;
    if (state.ok) {
      router.refresh();
    } else {
      toast.error(state.error);
    }
  }, [state, router]);

  const dirty = locale !== initialLocale;
  const saved = Boolean(state?.ok) && !dirty;

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="locale-select">{t("languageLabel")}</Label>
        <Select value={locale} onValueChange={(v) => setLocale(v as Locale)} disabled={pending}>
          <SelectTrigger id="locale-select" className="w-full max-w-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {locales.map((l) => (
              <SelectItem key={l} value={l}>
                {tLocale(l)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-muted-foreground text-xs">{t("languageHint")}</p>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending || !dirty}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {t("save")}
        </Button>
        {saved ? (
          <span className="text-success inline-flex items-center gap-1.5 text-sm">
            <CheckCircle2 className="size-3.5" aria-hidden />
            {t("saved")}
          </span>
        ) : null}
      </div>
    </form>
  );
}
