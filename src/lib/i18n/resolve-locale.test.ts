import { describe, expect, it } from "vitest";

import { parseAcceptLanguage } from "@/i18n/parse-accept-language";

describe("parseAcceptLanguage", () => {
  it("returns null for null/empty input", () => {
    const nul = parseAcceptLanguage(null);
    const empty = parseAcceptLanguage("");

    expect(nul).toBeNull();
    expect(empty).toBeNull();
  });

  it("matches Brazilian Portuguese to pt-BR", () => {
    const result = parseAcceptLanguage("pt-BR,pt;q=0.9,en;q=0.8");

    expect(result).toBe("pt-BR");
  });

  it("matches plain pt to pt-BR", () => {
    const result = parseAcceptLanguage("pt");

    expect(result).toBe("pt-BR");
  });

  it("matches Portuguese Portugal to pt-BR (no pt-PT bucket today)", () => {
    const result = parseAcceptLanguage("pt-PT,en;q=0.5");

    expect(result).toBe("pt-BR");
  });

  it("matches en-GB and en-US to en-US", () => {
    const gb = parseAcceptLanguage("en-GB");
    const us = parseAcceptLanguage("en-US,en;q=0.9");

    expect(gb).toBe("en-US");
    expect(us).toBe("en-US");
  });

  it("returns null when no supported language is present", () => {
    const result = parseAcceptLanguage("fr-FR,de;q=0.8");

    expect(result).toBeNull();
  });

  it("respects q-value ordering when picking between supported tags", () => {
    const ptHigher = parseAcceptLanguage("en;q=0.5,pt-BR;q=0.9");
    const enHigher = parseAcceptLanguage("pt-BR;q=0.4,en;q=0.9");

    expect(ptHigher).toBe("pt-BR");
    expect(enHigher).toBe("en-US");
  });

  it("skips unsupported high-priority entries and picks the next supported one", () => {
    const result = parseAcceptLanguage("fr-FR,pt-BR;q=0.8,en;q=0.5");

    expect(result).toBe("pt-BR");
  });

  it("tolerates malformed q-values without throwing", () => {
    const result = parseAcceptLanguage("pt-BR;q=banana,en;q=0.9");

    expect(result).toBe("en-US");
  });
});
