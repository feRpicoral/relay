import { describe, expect, it } from "vitest";

import { parseAcceptLanguage } from "@/i18n/parse-accept-language";

describe("parseAcceptLanguage", () => {
  it("returns null for null/empty input", () => {
    expect(parseAcceptLanguage(null)).toBeNull();
    expect(parseAcceptLanguage("")).toBeNull();
  });

  it("matches Brazilian Portuguese to pt-BR", () => {
    expect(parseAcceptLanguage("pt-BR,pt;q=0.9,en;q=0.8")).toBe("pt-BR");
  });

  it("matches plain pt to pt-BR", () => {
    expect(parseAcceptLanguage("pt")).toBe("pt-BR");
  });

  it("matches Portuguese Portugal to pt-BR (no pt-PT bucket today)", () => {
    expect(parseAcceptLanguage("pt-PT,en;q=0.5")).toBe("pt-BR");
  });

  it("matches en-GB and en-US to en-US", () => {
    expect(parseAcceptLanguage("en-GB")).toBe("en-US");
    expect(parseAcceptLanguage("en-US,en;q=0.9")).toBe("en-US");
  });

  it("returns null when no supported language is present", () => {
    expect(parseAcceptLanguage("fr-FR,de;q=0.8")).toBeNull();
  });

  it("respects q-value ordering when picking between supported tags", () => {
    expect(parseAcceptLanguage("en;q=0.5,pt-BR;q=0.9")).toBe("pt-BR");
    expect(parseAcceptLanguage("pt-BR;q=0.4,en;q=0.9")).toBe("en-US");
  });

  it("skips unsupported high-priority entries and picks the next supported one", () => {
    expect(parseAcceptLanguage("fr-FR,pt-BR;q=0.8,en;q=0.5")).toBe("pt-BR");
  });

  it("tolerates malformed q-values without throwing", () => {
    expect(parseAcceptLanguage("pt-BR;q=banana,en;q=0.9")).toBe("en-US");
  });
});
