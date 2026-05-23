import { describe, expect, it } from "vitest";

import { E164_REGEX, isE164 } from "./phone";

describe("isE164 — accepts", () => {
  it("Brazilian mobile", () => {
    expect(isE164("+5511987654321")).toBe(true);
  });
  it("US", () => {
    expect(isE164("+14155551234")).toBe(true);
  });
  it("UK", () => {
    expect(isE164("+442012345678")).toBe(true);
  });
  it("minimum length (7 digits = leading + 6)", () => {
    expect(isE164("+1234567")).toBe(true);
  });
  it("maximum length (18 digits = leading + 17)", () => {
    expect(isE164("+123456789012345678")).toBe(true);
  });
});

describe("isE164 — rejects", () => {
  it("missing leading plus", () => {
    expect(isE164("5511987654321")).toBe(false);
  });
  it("country code starting with 0", () => {
    expect(isE164("+0511987654321")).toBe(false);
  });
  it("letters anywhere", () => {
    expect(isE164("+551198765432a")).toBe(false);
    expect(isE164("+abc")).toBe(false);
  });
  it("spaces", () => {
    expect(isE164("+55 11 98765 4321")).toBe(false);
  });
  it("dashes", () => {
    expect(isE164("+55-11-98765-4321")).toBe(false);
  });
  it("parentheses", () => {
    expect(isE164("+1(415)5551234")).toBe(false);
  });
  it("empty / only plus", () => {
    expect(isE164("")).toBe(false);
    expect(isE164("+")).toBe(false);
  });
  it("too short (6 digits total)", () => {
    expect(isE164("+123456")).toBe(false);
  });
  it("too long (19 digits total)", () => {
    expect(isE164("+1234567890123456789")).toBe(false);
  });
});

describe("E164_REGEX", () => {
  it("is exported and behaves like isE164", () => {
    expect(E164_REGEX.test("+14155551234")).toBe(true);
    expect(E164_REGEX.test("invalid")).toBe(false);
  });
});
