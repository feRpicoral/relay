/**
 * Translator-aware label helpers for the Call enums. Translation keys live in
 * `messages/*.json` under `enums.outcome.*` / `enums.callStatus.*` /
 * `enums.callDirection.*`.
 */
import type { CallDirection, CallOutcome, CallStatus } from "@prisma/client";

/**
 * The next-intl translator returned by `useTranslations(namespace)` /
 * `getTranslations(namespace)` is typed against the keys in that namespace.
 * We accept the runtime callable shape here so each helper can be invoked
 * with the namespace-scoped translator without TS narrowing complaints.
 */
type EnumTranslator<Keys extends string> = (key: Keys) => string;

export function outcomeLabel(outcome: CallOutcome, t: EnumTranslator<CallOutcome>): string {
  return t(outcome);
}

export function callStatusLabel(status: CallStatus, t: EnumTranslator<CallStatus>): string {
  return t(status);
}

export function callDirectionLabel(
  direction: CallDirection,
  t: EnumTranslator<CallDirection>,
): string {
  return t(direction);
}
