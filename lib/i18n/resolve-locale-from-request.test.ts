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
    expect(resolveLocaleFromRequest(makeReq("pt-BR"))).toBe("pt-BR");
    expect(resolveLocaleFromRequest(makeReq("en-US"))).toBe("en-US");
  });

  it("ignores an invalid cookie locale and falls through to the header", () => {
    expect(resolveLocaleFromRequest(makeReq("fr-FR", "pt-BR;q=0.9"))).toBe("pt-BR");
  });

  it("prefers a valid cookie over the Accept-Language header", () => {
    expect(resolveLocaleFromRequest(makeReq("pt-BR", "en-US,en;q=0.9"))).toBe("pt-BR");
  });
});

describe("resolveLocaleFromRequest — header tier (middle priority)", () => {
  it("uses Accept-Language when no cookie is present", () => {
    expect(resolveLocaleFromRequest(makeReq(null, "pt-BR,en;q=0.5"))).toBe("pt-BR");
  });

  it("respects q-value ordering when picking between supported tags", () => {
    expect(resolveLocaleFromRequest(makeReq(null, "en;q=0.5,pt-BR;q=0.9"))).toBe("pt-BR");
  });

  it("maps en-GB to en-US (primary-tag bucket)", () => {
    expect(resolveLocaleFromRequest(makeReq(null, "en-GB"))).toBe("en-US");
  });
});

describe("resolveLocaleFromRequest — default tier (lowest priority)", () => {
  it("falls back to en-US when nothing matches", () => {
    expect(resolveLocaleFromRequest(makeReq(null, null))).toBe("en-US");
    expect(resolveLocaleFromRequest(makeReq(null, "fr-FR,de;q=0.8"))).toBe("en-US");
  });

  it("falls back when both cookie and header are unrecognized", () => {
    expect(resolveLocaleFromRequest(makeReq("unknown", "fr-FR"))).toBe("en-US");
  });
});
