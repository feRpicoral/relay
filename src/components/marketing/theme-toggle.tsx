"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

const ICON_SIZE = 17;

/**
 * Both icons are rendered; which one shows is driven by the `.dark` class in
 * the stylesheet, so server and client markup match and the glyph is correct on
 * first paint. `resolvedTheme` is only read in the click handler.
 */
export function ThemeToggle({ className, label }: { className?: string; label: string }) {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <button
      type="button"
      className={className}
      aria-label={label}
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <Sun size={ICON_SIZE} strokeWidth={2} data-theme-icon="light" />
      <Moon size={ICON_SIZE} strokeWidth={2} data-theme-icon="dark" />
    </button>
  );
}
