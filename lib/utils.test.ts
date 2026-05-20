import { describe, expect, it } from "vitest";

import { compactNumber, currency, formatDuration, formatPhone, percent } from "./utils";

describe("formatDuration", () => {
  it("formats sub-second", () => {
    expect(formatDuration(450)).toBe("450ms");
  });
  it("formats seconds", () => {
    expect(formatDuration(12_300)).toBe("12s");
  });
  it("formats minutes + seconds", () => {
    expect(formatDuration(125_000)).toBe("2m 05s");
  });
});

describe("formatPhone", () => {
  it("formats Brazilian mobile", () => {
    expect(formatPhone("+5511987654321")).toBe("+55 (11) 98765-4321");
  });
  it("formats US number", () => {
    expect(formatPhone("+14155551234")).toBe("+1 (415) 555-1234");
  });
  it("passes unrecognized through", () => {
    expect(formatPhone("+442012345678")).toBe("+442012345678");
  });
});

describe("compactNumber", () => {
  it("compacts thousands", () => {
    expect(compactNumber(12_500)).toMatch(/12\.5/);
  });
});

describe("percent", () => {
  it("formats with default digits", () => {
    expect(percent(0.456)).toBe("45.6%");
  });
});

describe("currency", () => {
  it("formats USD by default", () => {
    expect(currency(1234)).toBe("$12.34");
  });
});
