import { describe, expect, it } from "vitest";

import { safeNextPath } from "./safe-redirect";

describe("safeNextPath — accepts", () => {
  it("a same-origin path", () => {
    const dashboard = safeNextPath("/dashboard");
    const nested = safeNextPath("/agents/123/edit");

    expect(dashboard).toBe("/dashboard");
    expect(nested).toBe("/agents/123/edit");
  });

  it("a path with a query string", () => {
    const result = safeNextPath("/calls?status=live");

    expect(result).toBe("/calls?status=live");
  });

  it("a path with a fragment", () => {
    const result = safeNextPath("/settings#calendar");

    expect(result).toBe("/settings#calendar");
  });
});

describe("safeNextPath — rejects", () => {
  it("null / undefined / empty", () => {
    const nul = safeNextPath(null);
    const undef = safeNextPath(undefined);
    const empty = safeNextPath("");

    expect(nul).toBeNull();
    expect(undef).toBeNull();
    expect(empty).toBeNull();
  });

  it("absolute http(s) URLs", () => {
    const https = safeNextPath("https://evil.com/x");
    const http = safeNextPath("http://evil.com");

    expect(https).toBeNull();
    expect(http).toBeNull();
  });

  it("protocol-relative URLs", () => {
    const bare = safeNextPath("//evil.com");
    const withPath = safeNextPath("//evil.com/path");

    expect(bare).toBeNull();
    expect(withPath).toBeNull();
  });

  it("backslash tricks", () => {
    const slashThenBackslash = safeNextPath("/\\evil.com");
    const doubleBackslash = safeNextPath("\\\\evil.com");
    const embeddedBackslash = safeNextPath("/path\\evil");

    expect(slashThenBackslash).toBeNull();
    expect(doubleBackslash).toBeNull();
    expect(embeddedBackslash).toBeNull();
  });

  it("scheme-bearing strings (no leading slash)", () => {
    const js = safeNextPath("javascript:alert(1)");
    const data = safeNextPath("data:text/html,evil");

    expect(js).toBeNull();
    expect(data).toBeNull();
  });

  it("paths without a leading slash", () => {
    const bare = safeNextPath("dashboard");
    const relative = safeNextPath("./relative");

    expect(bare).toBeNull();
    expect(relative).toBeNull();
  });

  it("control characters and whitespace inside the path", () => {
    const space = safeNextPath("/has space");
    const tab = safeNextPath("/has\ttab");
    const newline = safeNextPath("/has\nnewline");
    const cr = safeNextPath("/has\rcr");
    const nul = safeNextPath("/has\x00null");
    const del = safeNextPath("/has\x7Fdel");

    expect(space).toBeNull();
    expect(tab).toBeNull();
    expect(newline).toBeNull();
    expect(cr).toBeNull();
    expect(nul).toBeNull();
    expect(del).toBeNull();
  });
});
