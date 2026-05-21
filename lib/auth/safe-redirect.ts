/**
 * Returns `candidate` only if it is a same-origin path that is safe to redirect
 * to. Anything else (absolute URL, protocol-relative `//evil.com`, missing
 * leading slash) is rejected to `null`.
 *
 * Open-redirect prevention for `?next=` query parameters that flow through
 * login, signup, and the OAuth callback.
 */
export function safeNextPath(candidate: string | null | undefined): string | null {
  if (!candidate) return null;
  // Must start with a single slash and not look like a protocol-relative URL.
  if (!candidate.startsWith("/")) return null;
  if (candidate.startsWith("//")) return null;
  // Backslashes can be normalized to `/` by some browsers and slip past the
  // `//` check; reject them outright.
  if (candidate.includes("\\")) return null;
  // Reject control chars (incl. tab/newline/CR) and any whitespace that might
  // confuse downstream URL parsers.

  if (/[\x00-\x20\x7F]/.test(candidate)) return null;
  return candidate;
}
