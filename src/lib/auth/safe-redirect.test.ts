import { describe, expect, it } from "vitest";

import { safeNextPath } from "./safe-redirect";

describe("safeNextPath — accepts", () => {
  it("a same-origin path", () => {
    expect(safeNextPath("/dashboard")).toBe("/dashboard");
    expect(safeNextPath("/agents/123/edit")).toBe("/agents/123/edit");
  });

  it("a path with a query string", () => {
    expect(safeNextPath("/calls?status=live")).toBe("/calls?status=live");
  });

  it("a path with a fragment", () => {
    expect(safeNextPath("/settings#calendar")).toBe("/settings#calendar");
  });
});

describe("safeNextPath — rejects", () => {
  it("null / undefined / empty", () => {
    expect(safeNextPath(null)).toBeNull();
    expect(safeNextPath(undefined)).toBeNull();
    expect(safeNextPath("")).toBeNull();
  });

  it("absolute http(s) URLs", () => {
    expect(safeNextPath("https://evil.com/x")).toBeNull();
    expect(safeNextPath("http://evil.com")).toBeNull();
  });

  it("protocol-relative URLs", () => {
    expect(safeNextPath("//evil.com")).toBeNull();
    expect(safeNextPath("//evil.com/path")).toBeNull();
  });

  it("backslash tricks", () => {
    expect(safeNextPath("/\\evil.com")).toBeNull();
    expect(safeNextPath("\\\\evil.com")).toBeNull();
    expect(safeNextPath("/path\\evil")).toBeNull();
  });

  it("scheme-bearing strings (no leading slash)", () => {
    expect(safeNextPath("javascript:alert(1)")).toBeNull();
    expect(safeNextPath("data:text/html,evil")).toBeNull();
  });

  it("paths without a leading slash", () => {
    expect(safeNextPath("dashboard")).toBeNull();
    expect(safeNextPath("./relative")).toBeNull();
  });

  it("control characters and whitespace inside the path", () => {
    expect(safeNextPath("/has space")).toBeNull();
    expect(safeNextPath("/has\ttab")).toBeNull();
    expect(safeNextPath("/has\nnewline")).toBeNull();
    expect(safeNextPath("/has\rcr")).toBeNull();
    expect(safeNextPath("/has\x00null")).toBeNull();
    expect(safeNextPath("/has\x7Fdel")).toBeNull();
  });
});
