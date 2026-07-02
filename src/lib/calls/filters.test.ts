import { describe, expect, it } from "vitest";

import { buildCallWhere, hasActiveFilters, parseCallFilters, searchParamsToQuery } from "./filters";

describe("parseCallFilters", () => {
  it("returns defaults for empty params", () => {
    const filters = parseCallFilters({});

    expect(filters).toEqual({
      search: null,
      status: null,
      outcome: null,
      sentiment: null,
      direction: null,
      range: "all",
    });
  });

  it("keeps valid enum values and trims search", () => {
    const filters = parseCallFilters({
      q: "  +55 11  ",
      status: "COMPLETED",
      outcome: "SCHEDULED",
      sentiment: "POSITIVE",
      direction: "INBOUND",
      range: "30d",
    });

    expect(filters).toEqual({
      search: "+55 11",
      status: "COMPLETED",
      outcome: "SCHEDULED",
      sentiment: "POSITIVE",
      direction: "INBOUND",
      range: "30d",
    });
  });

  it("drops unknown enum values and falls back to range all", () => {
    const filters = parseCallFilters({
      status: "BOGUS",
      sentiment: "weird",
      range: "year",
    });

    expect(filters.status).toBeNull();
    expect(filters.sentiment).toBeNull();
    expect(filters.range).toBe("all");
  });

  it("treats a whitespace-only search as no search", () => {
    const filters = parseCallFilters({ q: "   " });

    expect(filters.search).toBeNull();
  });
});

describe("hasActiveFilters", () => {
  it("is false for the default filter set", () => {
    expect(hasActiveFilters(parseCallFilters({}))).toBe(false);
  });

  it("is true when any dimension is set", () => {
    expect(hasActiveFilters(parseCallFilters({ status: "FAILED" }))).toBe(true);
    expect(hasActiveFilters(parseCallFilters({ range: "7d" }))).toBe(true);
    expect(hasActiveFilters(parseCallFilters({ q: "ana" }))).toBe(true);
  });
});

describe("buildCallWhere", () => {
  it("omits orgId and produces an empty where with no filters", () => {
    const where = buildCallWhere(parseCallFilters({}));

    expect(where).toEqual({});
  });

  it("maps enum filters directly", () => {
    const where = buildCallWhere(
      parseCallFilters({
        status: "COMPLETED",
        outcome: "QUALIFIED",
        sentiment: "NEGATIVE",
        direction: "OUTBOUND",
      }),
    );

    expect(where.status).toBe("COMPLETED");
    expect(where.outcome).toBe("QUALIFIED");
    expect(where.sentiment).toBe("NEGATIVE");
    expect(where.direction).toBe("OUTBOUND");
  });

  it("computes the date-range lower bound from a fixed now", () => {
    const now = new Date("2026-06-27T12:00:00.000Z");

    const where = buildCallWhere(parseCallFilters({ range: "7d" }), now);

    expect(where.startedAt).toEqual({ gte: new Date("2026-06-20T12:00:00.000Z") });
  });

  it("searches caller, callee, and linked lead name", () => {
    const where = buildCallWhere(parseCallFilters({ q: "ana" }));

    expect(where.OR).toEqual([
      { callerE164: { contains: "ana", mode: "insensitive" } },
      { calleeE164: { contains: "ana", mode: "insensitive" } },
      { campaignAttempt: { lead: { name: { contains: "ana", mode: "insensitive" } } } },
    ]);
  });
});

describe("searchParamsToQuery", () => {
  it("drops undefined and empty values", () => {
    const usp = searchParamsToQuery({ q: "ana", status: undefined, page: "" });

    expect(usp.toString()).toBe("q=ana");
  });

  it("preserves present values including page", () => {
    const usp = searchParamsToQuery({ q: "ana", status: "COMPLETED", page: "2" });

    expect(usp.get("q")).toBe("ana");
    expect(usp.get("status")).toBe("COMPLETED");
    expect(usp.get("page")).toBe("2");
  });
});
