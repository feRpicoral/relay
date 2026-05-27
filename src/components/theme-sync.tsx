"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";

/** Seeds next-themes from the DB preference, then leaves local toggles alone. */
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
