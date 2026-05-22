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
    expect(isLocale("en-US")).toBe(true);
    expect(isLocale("pt-BR")).toBe(true);
  });

  it("rejects unsupported strings", () => {
    expect(isLocale("fr-FR")).toBe(false);
    expect(isLocale("en")).toBe(false); // primary tag without region
    expect(isLocale("pt-PT")).toBe(false);
    expect(isLocale("")).toBe(false);
  });

  it("rejects non-string values", () => {
    expect(isLocale(undefined)).toBe(false);
    expect(isLocale(null)).toBe(false);
    expect(isLocale(42)).toBe(false);
    expect(isLocale({})).toBe(false);
  });
});

describe("isUrlSlug", () => {
  it("accepts known URL slugs (lowercase)", () => {
    expect(isUrlSlug("en")).toBe(true);
    expect(isUrlSlug("pt-br")).toBe(true);
  });

  it("rejects BCP-47 tags (case-sensitive)", () => {
    expect(isUrlSlug("en-US")).toBe(false);
    expect(isUrlSlug("pt-BR")).toBe(false);
    expect(isUrlSlug("EN")).toBe(false);
  });

  it("rejects unknown slugs and non-strings", () => {
    expect(isUrlSlug("fr")).toBe(false);
    expect(isUrlSlug("")).toBe(false);
    expect(isUrlSlug(undefined)).toBe(false);
    expect(isUrlSlug(null)).toBe(false);
  });
});

describe("slugToLocale", () => {
  it("converts known URL slugs to BCP-47 locales", () => {
    expect(slugToLocale("en")).toBe("en-US");
    expect(slugToLocale("pt-br")).toBe("pt-BR");
  });

  it("returns null for unknown slugs", () => {
    expect(slugToLocale("fr")).toBeNull();
    expect(slugToLocale("EN")).toBeNull(); // case-sensitive
    expect(slugToLocale("")).toBeNull();
  });
});

describe("fromPrismaLocale / toPrismaLocale", () => {
  it("converts Prisma enum to BCP-47", () => {
    expect(fromPrismaLocale("EN_US")).toBe("en-US");
    expect(fromPrismaLocale("PT_BR")).toBe("pt-BR");
  });

  it("converts BCP-47 to Prisma enum", () => {
    expect(toPrismaLocale("en-US")).toBe("EN_US");
    expect(toPrismaLocale("pt-BR")).toBe("PT_BR");
  });

  it("round-trips through both functions", () => {
    expect(fromPrismaLocale(toPrismaLocale("en-US"))).toBe("en-US");
    expect(fromPrismaLocale(toPrismaLocale("pt-BR"))).toBe("pt-BR");
  });
});
