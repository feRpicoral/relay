import { describe, expect, it } from "vitest";

import { extractRelevantSpan } from "./lookup-kb";

describe("extractRelevantSpan — query not found", () => {
  it("returns the head of the body up to `span`", () => {
    const body = "a".repeat(300);

    const result = extractRelevantSpan(body, "missing", 100);

    expect(result).toBe("a".repeat(100));
  });

  it("returns the whole body if it's shorter than `span`", () => {
    const body = "hello world";

    const result = extractRelevantSpan(body, "missing");

    expect(result).toBe("hello world");
  });
});

describe("extractRelevantSpan — query found", () => {
  const padded = "x".repeat(100) + "TARGET" + "y".repeat(100);

  it("centers the span around the match", () => {
    const result = extractRelevantSpan(padded, "TARGET", 60);

    expect(result).toContain("TARGET");
    // Plus possible "..." prefix and suffix
    expect(result.length).toBeLessThanOrEqual(60 + 6);
  });

  it("adds leading ellipsis when the match is not at the start", () => {
    const result = extractRelevantSpan(padded, "TARGET", 60);

    expect(result.startsWith("...")).toBe(true);
  });

  it("adds trailing ellipsis when the match is not near the end", () => {
    const result = extractRelevantSpan(padded, "TARGET", 60);

    expect(result.endsWith("...")).toBe(true);
  });

  it("is case-insensitive on the search term", () => {
    const body = "a".repeat(50) + "Target" + "b".repeat(50);

    const result = extractRelevantSpan(body, "target", 80);

    expect(result).toContain("Target");
  });

  it("omits leading ellipsis when the match is at position 0", () => {
    const body = "TARGET" + "y".repeat(200);

    const result = extractRelevantSpan(body, "TARGET", 60);

    expect(result.startsWith("...")).toBe(false);
  });

  it("omits trailing ellipsis when the span reaches the end of the body", () => {
    const body = "x".repeat(20) + "TARGET";

    const result = extractRelevantSpan(body, "TARGET", 60);

    expect(result.endsWith("...")).toBe(false);
  });
});
