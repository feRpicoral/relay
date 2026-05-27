import { describe, expect, it } from "vitest";

import { compactNumber, currency, formatDuration, formatPhone, percent } from "./utils";

describe("formatDuration", () => {
  it("formats sub-second", () => {
    const result = formatDuration(450);

    expect(result).toBe("450ms");
  });

  it("formats seconds", () => {
    const result = formatDuration(12_300);

    expect(result).toBe("12s");
  });

  it("formats minutes + seconds", () => {
    const result = formatDuration(125_000);

    expect(result).toBe("2m 05s");
  });
});

describe("formatPhone", () => {
  it("formats Brazilian mobile", () => {
    const result = formatPhone("+5511987654321");

    expect(result).toBe("+55 (11) 98765-4321");
  });

  it("formats US number", () => {
    const result = formatPhone("+14155551234");

    expect(result).toBe("+1 (415) 555-1234");
  });

  it("passes unrecognized through", () => {
    const result = formatPhone("+442012345678");

    expect(result).toBe("+442012345678");
  });
});

describe("compactNumber", () => {
  it("compacts thousands", () => {
    const result = compactNumber(12_500);

    expect(result).toMatch(/12\.5/);
  });
});

describe("percent", () => {
  it("formats with default digits", () => {
    const result = percent(0.456);

    expect(result).toBe("45.6%");
  });
});

describe("currency", () => {
  it("formats USD by default", () => {
    const result = currency(1234);

    expect(result).toBe("$12.34");
  });
});
