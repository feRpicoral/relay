"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";

/**
 * Makes the DB-stored user preference the source of truth.
 *
 * next-themes persists the active theme in localStorage, which is per-origin
 * and per-browser. That means a user who toggles to "light" on their laptop
 * gets dark again when they sign in from their phone, because the new
 * device's localStorage is empty.
 *
 * This component runs once on mount inside the authenticated (app) layout
 * (where we have the user's session and can read `themePreference` from the
 * DB). It calls `setTheme()` with the DB value, which makes next-themes
 * overwrite localStorage. From then on the local toggle is in sync with the
 * server, and any subsequent toggle persists back via setThemePreferenceAction.
 */
export function ThemeSync({ initial }: { initial: "light" | "dark" }) {
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    if (theme !== initial) setTheme(initial);
    // We INTENTIONALLY do not include `theme` or `setTheme` in deps — running
    // this only on mount (and when `initial` changes between sessions) means
    // the user can still toggle freely without us snapping them back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  return null;
}
