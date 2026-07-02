"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

/**
 * Which icon shows is driven purely by the `.dark` class in CSS, so there is
 * no hydration mismatch and the glyph is correct on first paint. The click
 * handler flips the next-themes value.
 */
export function ThemeToggle({ label }: { label: string }) {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <button
      type="button"
      className="icon-toggle theme-btn"
      aria-label={label}
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <span className="s">
        <Sun size={17} strokeWidth={2} />
      </span>
      <span className="m">
        <Moon size={17} strokeWidth={2} />
      </span>
    </button>
  );
}
