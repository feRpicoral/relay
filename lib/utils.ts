import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const totalSeconds = Math.floor(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

export function formatPhone(e164: string): string {
  if (e164.startsWith("+55") && e164.length === 14) {
    const ddd = e164.slice(3, 5);
    const a = e164.slice(5, 10);
    const b = e164.slice(10);
    return `+55 (${ddd}) ${a}-${b}`;
  }
  if (e164.startsWith("+1") && e164.length === 12) {
    const area = e164.slice(2, 5);
    const a = e164.slice(5, 8);
    const b = e164.slice(8);
    return `+1 (${area}) ${a}-${b}`;
  }
  return e164;
}

export function compactNumber(n: number): string {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export function percent(n: number, digits = 1): string {
  return `${(n * 100).toFixed(digits)}%`;
}

export function currency(cents: number, currencyCode: "USD" | "BRL" = "USD"): string {
  return new Intl.NumberFormat(currencyCode === "BRL" ? "pt-BR" : "en-US", {
    style: "currency",
    currency: currencyCode,
  }).format(cents / 100);
}

export function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
