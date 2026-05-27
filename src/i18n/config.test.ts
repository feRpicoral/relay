import { describe, expect, it } from "vitest";

import {
  defaultLocale,
  fromPrismaLocale,
  isLocale,
  isUrlSlug,
  locales,
  slugToLocale,
  toPrismaLocale,
} from "./config";

describe("locales / defaultLocale", () => {
  it("includes the two supported locales", () => {
    expect(locales).toContain("en-US");
    expect(locales).toContain("pt-BR");
  });

  it("defaults to en-US", () => {
    expect(defaultLocale).toBe("en-US");
  });
});

describe("isLocale", () => {
  it("accepts supported BCP-47 tags", () => {
    const enUs = isLocale("en-US");
    const ptBr = isLocale("pt-BR");

    expect(enUs).toBe(true);
    expect(ptBr).toBe(true);
  });

  it("rejects unsupported strings", () => {
    const frFr = isLocale("fr-FR");
    const en = isLocale("en");
    const ptPt = isLocale("pt-PT");
    const empty = isLocale("");

    expect(frFr).toBe(false);
    expect(en).toBe(false);
    expect(ptPt).toBe(false);
    expect(empty).toBe(false);
  });

  it("rejects non-string values", () => {
    const undef = isLocale(undefined);
    const nul = isLocale(null);
    const num = isLocale(42);
    const obj = isLocale({});

    expect(undef).toBe(false);
    expect(nul).toBe(false);
    expect(num).toBe(false);
    expect(obj).toBe(false);
  });
});

describe("isUrlSlug", () => {
  it("accepts known URL slugs (lowercase)", () => {
    const en = isUrlSlug("en");
    const ptBr = isUrlSlug("pt-br");

    expect(en).toBe(true);
    expect(ptBr).toBe(true);
  });

  it("rejects BCP-47 tags (case-sensitive)", () => {
    const enUs = isUrlSlug("en-US");
    const ptBr = isUrlSlug("pt-BR");
    const upper = isUrlSlug("EN");

    expect(enUs).toBe(false);
    expect(ptBr).toBe(false);
    expect(upper).toBe(false);
  });

  it("rejects unknown slugs and non-strings", () => {
    const fr = isUrlSlug("fr");
    const empty = isUrlSlug("");
    const undef = isUrlSlug(undefined);
    const nul = isUrlSlug(null);

    expect(fr).toBe(false);
    expect(empty).toBe(false);
    expect(undef).toBe(false);
    expect(nul).toBe(false);
  });
});

describe("slugToLocale", () => {
  it("converts known URL slugs to BCP-47 locales", () => {
    const en = slugToLocale("en");
    const ptBr = slugToLocale("pt-br");

    expect(en).toBe("en-US");
    expect(ptBr).toBe("pt-BR");
  });

  it("returns null for unknown slugs", () => {
    const fr = slugToLocale("fr");
    const upper = slugToLocale("EN");
    const empty = slugToLocale("");

    expect(fr).toBeNull();
    expect(upper).toBeNull();
    expect(empty).toBeNull();
  });
});

describe("fromPrismaLocale / toPrismaLocale", () => {
  it("converts Prisma enum to BCP-47", () => {
    const enUs = fromPrismaLocale("EN_US");
    const ptBr = fromPrismaLocale("PT_BR");

    expect(enUs).toBe("en-US");
    expect(ptBr).toBe("pt-BR");
  });

  it("converts BCP-47 to Prisma enum", () => {
    const enUs = toPrismaLocale("en-US");
    const ptBr = toPrismaLocale("pt-BR");

    expect(enUs).toBe("EN_US");
    expect(ptBr).toBe("PT_BR");
  });

  it("round-trips through both functions", () => {
    const enUs = fromPrismaLocale(toPrismaLocale("en-US"));
    const ptBr = fromPrismaLocale(toPrismaLocale("pt-BR"));

    expect(enUs).toBe("en-US");
    expect(ptBr).toBe("pt-BR");
  });
});
