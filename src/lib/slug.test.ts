import { describe, expect, it } from "vitest";

import { slugify } from "./slug";

describe("slugify", () => {
  it("lowercases and joins words with dashes", () => {
    const result = slugify("Hello World");

    expect(result).toBe("hello-world");
  });

  it("strips accents via NFD + combining-mark removal", () => {
    const ola = slugify("Olá Mundo");
    const sao = slugify("São Paulo");
    const resume = slugify("résumé");

    expect(ola).toBe("ola-mundo");
    expect(sao).toBe("sao-paulo");
    expect(resume).toBe("resume");
  });

  it("collapses runs of non-alphanumeric chars into a single dash", () => {
    const result = slugify("a    b !!! c");

    expect(result).toBe("a-b-c");
  });

  it("trims leading and trailing dashes", () => {
    const dashes = slugify("---hello---");
    const spaces = slugify("   hello   ");

    expect(dashes).toBe("hello");
    expect(spaces).toBe("hello");
  });

  it("returns empty string when input contains no alphanumerics", () => {
    const punct = slugify("@@@!!!");
    const blank = slugify("   ");

    expect(punct).toBe("");
    expect(blank).toBe("");
  });

  it("preserves alphanumerics", () => {
    const result = slugify("Org 2026 v2");

    expect(result).toBe("org-2026-v2");
  });

  it("truncates at the 48-char cap", () => {
    const input = "a".repeat(100);

    const result = slugify(input);

    expect(result.length).toBe(48);
  });

  it("treats emoji and other unicode as separators", () => {
    const result = slugify("Hello 🚀 World");

    expect(result).toBe("hello-world");
  });
});
