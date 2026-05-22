import { describe, expect, it } from "vitest";

import { extractRelevantSpan } from "./lookup-kb";

describe("extractRelevantSpan — query not found", () => {
  it("returns the head of the body up to `span`", () => {
    const body = "a".repeat(300);
    expect(extractRelevantSpan(body, "missing", 100)).toBe("a".repeat(100));
  });

  it("returns the whole body if it's shorter than `span`", () => {
    expect(extractRelevantSpan("hello world", "missing")).toBe("hello world");
  });
});

describe("extractRelevantSpan — query found", () => {
  const padded = "x".repeat(100) + "TARGET" + "y".repeat(100);

  it("centers the span around the match", () => {
    const out = extractRelevantSpan(padded, "TARGET", 60);
    expect(out).toContain("TARGET");
    // Plus possible "..." prefix and suffix
    expect(out.length).toBeLessThanOrEqual(60 + 6);
  });

  it("adds leading ellipsis when the match is not at the start", () => {
    expect(extractRelevantSpan(padded, "TARGET", 60).startsWith("...")).toBe(true);
  });

  it("adds trailing ellipsis when the match is not near the end", () => {
    expect(extractRelevantSpan(padded, "TARGET", 60).endsWith("...")).toBe(true);
  });

  it("is case-insensitive on the search term", () => {
    const body = "a".repeat(50) + "Target" + "b".repeat(50);
    expect(extractRelevantSpan(body, "target", 80)).toContain("Target");
  });

  it("omits leading ellipsis when the match is at position 0", () => {
    const body = "TARGET" + "y".repeat(200);
    expect(extractRelevantSpan(body, "TARGET", 60).startsWith("...")).toBe(false);
  });

  it("omits trailing ellipsis when the span reaches the end of the body", () => {
    const body = "x".repeat(20) + "TARGET";
    expect(extractRelevantSpan(body, "TARGET", 60).endsWith("...")).toBe(false);
  });
});
