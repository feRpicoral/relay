"use client";

import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useTransition } from "react";

import { setThemePreferenceAction } from "@/app/(app)/actions";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Sun↔Moon icon toggle. Updates next-themes' local state immediately for
 * instant visual feedback, then fires the server action in a transition so
 * the persisted preference catches up without blocking the click.
 */
export function ThemeToggle() {
  const t = useTranslations("themeToggle");
  const { theme, setTheme } = useTheme();
  const [pending, startTransition] = useTransition();

  // next-themes returns `theme === undefined` during SSR / pre-hydration.
  // Rendering a sized placeholder reserves the layout slot so the avatar
  // block doesn't jump when the real button mounts. Using next-themes'
  // own SSR signal lets us avoid the `useState + useEffect(setState)` trick
  // that the new react-hooks/set-state-in-effect rule rejects.
  if (theme === undefined) {
    return <div className="h-8 w-8" aria-hidden />;
  }

  const isDark = theme === "dark";
  const next = isDark ? "light" : "dark";

  function onToggle() {
    setTheme(next);
    startTransition(async () => {
      const result = await setThemePreferenceAction({ theme: next });
      if (!result.ok) {
        // Server rejected (unlikely outside of session expiry). Roll back
        // the optimistic local change so the UI stays consistent with the DB.
        setTheme(isDark ? "dark" : "light");
      }
    });
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onToggle}
          disabled={pending}
          aria-label={isDark ? t("switchToLightAria") : t("switchToDarkAria")}
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">{isDark ? t("lightTheme") : t("darkTheme")}</TooltipContent>
    </Tooltip>
  );
}
