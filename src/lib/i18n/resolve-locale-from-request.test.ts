import { describe, expect, it, vi } from "vitest";

// resolve-locale.ts uses `import "server-only"` to guard against client
// bundling. The package throws on import in plain Node, so we mock it for
// the test. Hoisted by vitest above the import below.
vi.mock("server-only", () => ({}));

import { resolveLocaleFromRequest } from "./resolve-locale";

/**
 * Minimal `NextRequest` stub — `resolveLocaleFromRequest` only touches
 * `cookies.get()` and `headers.get()`, so a hand-rolled object suffices.
 */
function makeReq(
  cookieValue: string | null,
  acceptLanguage: string | null = null,
): Parameters<typeof resolveLocaleFromRequest>[0] {
  return {
    cookies: {
      get(name: string) {
        return cookieValue !== null && name === "NEXT_LOCALE" ? { value: cookieValue } : undefined;
      },
    },
    headers: {
      get(name: string) {
        return name === "accept-language" ? acceptLanguage : null;
      },
    },
  } as unknown as Parameters<typeof resolveLocaleFromRequest>[0];
}

describe("resolveLocaleFromRequest — cookie tier (highest priority)", () => {
  it("returns a valid cookie locale", () => {
    const ptReq = makeReq("pt-BR");
    const enReq = makeReq("en-US");

    const pt = resolveLocaleFromRequest(ptReq);
    const en = resolveLocaleFromRequest(enReq);

    expect(pt).toBe("pt-BR");
    expect(en).toBe("en-US");
  });

  it("ignores an invalid cookie locale and falls through to the header", () => {
    const req = makeReq("fr-FR", "pt-BR;q=0.9");

    const result = resolveLocaleFromRequest(req);

    expect(result).toBe("pt-BR");
  });

  it("prefers a valid cookie over the Accept-Language header", () => {
    const req = makeReq("pt-BR", "en-US,en;q=0.9");

    const result = resolveLocaleFromRequest(req);

    expect(result).toBe("pt-BR");
  });
});

describe("resolveLocaleFromRequest — header tier (middle priority)", () => {
  it("uses Accept-Language when no cookie is present", () => {
    const req = makeReq(null, "pt-BR,en;q=0.5");

    const result = resolveLocaleFromRequest(req);

    expect(result).toBe("pt-BR");
  });

  it("respects q-value ordering when picking between supported tags", () => {
    const req = makeReq(null, "en;q=0.5,pt-BR;q=0.9");

    const result = resolveLocaleFromRequest(req);

    expect(result).toBe("pt-BR");
  });

  it("maps en-GB to en-US (primary-tag bucket)", () => {
    const req = makeReq(null, "en-GB");

    const result = resolveLocaleFromRequest(req);

    expect(result).toBe("en-US");
  });
});

describe("resolveLocaleFromRequest — default tier (lowest priority)", () => {
  it("falls back to en-US when nothing matches", () => {
    const emptyReq = makeReq(null, null);
    const unsupportedReq = makeReq(null, "fr-FR,de;q=0.8");

    const empty = resolveLocaleFromRequest(emptyReq);
    const unsupported = resolveLocaleFromRequest(unsupportedReq);

    expect(empty).toBe("en-US");
    expect(unsupported).toBe("en-US");
  });

  it("falls back when both cookie and header are unrecognized", () => {
    const req = makeReq("unknown", "fr-FR");

    const result = resolveLocaleFromRequest(req);

    expect(result).toBe("en-US");
  });
});
