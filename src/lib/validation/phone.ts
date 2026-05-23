/**
 * Strict E.164 regex: leading `+`, country code starting 1-9, then 6-17 more
 * digits. Used by every place we accept a phone number from user input or
 * external data (campaigns CSV, agent fallback transfer, settings forms).
 */
export const E164_REGEX = /^\+[1-9]\d{6,17}$/;

export function isE164(s: string): boolean {
  return E164_REGEX.test(s);
}
