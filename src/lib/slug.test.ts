import { describe, expect, it } from "vitest";

import { slugify } from "./slug";

describe("slugify", () => {
  it("lowercases and joins words with dashes", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("strips accents via NFD + combining-mark removal", () => {
    expect(slugify("Olá Mundo")).toBe("ola-mundo");
    expect(slugify("São Paulo")).toBe("sao-paulo");
    expect(slugify("résumé")).toBe("resume");
  });

  it("collapses runs of non-alphanumeric chars into a single dash", () => {
    expect(slugify("a    b !!! c")).toBe("a-b-c");
  });

  it("trims leading and trailing dashes", () => {
    expect(slugify("---hello---")).toBe("hello");
    expect(slugify("   hello   ")).toBe("hello");
  });

  it("returns empty string when input contains no alphanumerics", () => {
    expect(slugify("@@@!!!")).toBe("");
    expect(slugify("   ")).toBe("");
  });

  it("preserves alphanumerics", () => {
    expect(slugify("Org 2026 v2")).toBe("org-2026-v2");
  });

  it("truncates at the 48-char cap", () => {
    expect(slugify("a".repeat(100)).length).toBe(48);
  });

  it("treats emoji and other unicode as separators", () => {
    expect(slugify("Hello 🚀 World")).toBe("hello-world");
  });
});
