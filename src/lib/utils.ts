import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

import { USD_TO_BRL } from "@/lib/constants";

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

export function compactNumber(n: number, locale = "en-US"): string {
  return new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export function percent(n: number, digits = 1): string {
  return `${(n * 100).toFixed(digits)}%`;
}

export function currency(
  cents: number,
  currencyCode: "USD" | "BRL" = "USD",
  locale = "en-US",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode,
  }).format(cents / 100);
}

/**
 * Cost shown as "$X.XX ≈ R$Y" using the static USD_TO_BRL estimate. Both the
 * call detail KPI and the analytics total use this.
 */
export function formatCostUsdBrl(cents: number, locale = "en-US"): string {
  const usd = currency(cents, "USD", locale);
  const brl = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(((cents / 100) * USD_TO_BRL) | 0);
  return `${usd} ≈ ${brl}`;
}

const MS_PER_MINUTE = 60 * 1000;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;

/**
 * Locale-aware relative time ("2h ago", "in 3 days"). Used for invite ages and
 * campaign lead last-call timestamps. `now` is injectable for testing.
 */
export function formatRelativeTime(date: Date, locale = "en-US", now: Date = new Date()): string {
  const diffMs = date.getTime() - now.getTime();
  const abs = Math.abs(diffMs);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (abs < MS_PER_HOUR) return rtf.format(Math.round(diffMs / MS_PER_MINUTE), "minute");
  if (abs < MS_PER_DAY) return rtf.format(Math.round(diffMs / MS_PER_HOUR), "hour");
  return rtf.format(Math.round(diffMs / MS_PER_DAY), "day");
}

export function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function daysAgo(days: number): Date {
  return new Date(Date.now() - days * MS_PER_DAY);
}

/**
 * Format a millisecond duration as `m:ss`. Used by audio-player, transcript
 * stream/history — anywhere we render a position inside a call.
 */
export function formatTimestamp(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}
