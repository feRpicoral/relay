import type { Locale } from "./config";

/**
 * Parse the `Accept-Language` header and return the first supported locale,
 * matching primary-language tags case-insensitively (so `pt`, `pt-PT`, and
 * `pt-BR` all map to `pt-BR`; `en`, `en-GB`, and `en-US` all map to
 * `en-US`). Returns null when nothing matches — callers fall back to the
 * cookie / default tier above.
 *
 * Sorts by q-value descending before matching so a header like
 * `fr-FR,pt-BR;q=0.8,en;q=0.5` picks pt-BR over en.
 */
export function parseAcceptLanguage(header: string | null): Locale | null {
  if (!header) return null;
  const entries = header
    .split(",")
    .map((part) => {
      const [tagRaw = "", ...params] = part.trim().split(";");
      const qParam = params.find((p) => p.trim().startsWith("q="));
      const q = qParam ? Number(qParam.trim().slice(2)) : 1;
      return { tag: tagRaw.trim().toLowerCase(), q: Number.isFinite(q) ? q : 0 };
    })
    .filter((e) => e.tag.length > 0)
    .sort((a, b) => b.q - a.q);

  for (const { tag } of entries) {
    const primary = tag.split("-")[0];
    if (primary === "pt") return "pt-BR";
    if (primary === "en") return "en-US";
  }
  return null;
}
