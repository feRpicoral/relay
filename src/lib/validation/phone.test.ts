import { describe, expect, it } from "vitest";

import { E164_REGEX, isE164 } from "./phone";

describe("isE164 — accepts", () => {
  it("Brazilian mobile", () => {
    const result = isE164("+5511987654321");

    expect(result).toBe(true);
  });

  it("US", () => {
    const result = isE164("+14155551234");

    expect(result).toBe(true);
  });

  it("UK", () => {
    const result = isE164("+442012345678");

    expect(result).toBe(true);
  });

  it("minimum length (7 digits = leading + 6)", () => {
    const result = isE164("+1234567");

    expect(result).toBe(true);
  });

  it("maximum length (18 digits = leading + 17)", () => {
    const result = isE164("+123456789012345678");

    expect(result).toBe(true);
  });
});

describe("isE164 — rejects", () => {
  it("missing leading plus", () => {
    const result = isE164("5511987654321");

    expect(result).toBe(false);
  });

  it("country code starting with 0", () => {
    const result = isE164("+0511987654321");

    expect(result).toBe(false);
  });

  it("letters anywhere", () => {
    const trailing = isE164("+551198765432a");
    const abc = isE164("+abc");

    expect(trailing).toBe(false);
    expect(abc).toBe(false);
  });

  it("spaces", () => {
    const result = isE164("+55 11 98765 4321");

    expect(result).toBe(false);
  });

  it("dashes", () => {
    const result = isE164("+55-11-98765-4321");

    expect(result).toBe(false);
  });

  it("parentheses", () => {
    const result = isE164("+1(415)5551234");

    expect(result).toBe(false);
  });

  it("empty / only plus", () => {
    const empty = isE164("");
    const plus = isE164("+");

    expect(empty).toBe(false);
    expect(plus).toBe(false);
  });

  it("too short (6 digits total)", () => {
    const result = isE164("+123456");

    expect(result).toBe(false);
  });

  it("too long (19 digits total)", () => {
    const result = isE164("+1234567890123456789");

    expect(result).toBe(false);
  });
});

describe("E164_REGEX", () => {
  it("is exported and behaves like isE164", () => {
    const valid = E164_REGEX.test("+14155551234");
    const invalid = E164_REGEX.test("invalid");

    expect(valid).toBe(true);
    expect(invalid).toBe(false);
  });
});
