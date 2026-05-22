import { describe, expect, it } from "vitest";

import { withinWorkingHours } from "./campaign-tick";

// Local-time Date constructors so `now.getDay()` / `now.getHours()` return
// timezone-independent values across CI machines. May 21, 2026 is a Thursday.
const THURSDAY_10AM = new Date(2026, 4, 21, 10, 0);
const THURSDAY_6PM = new Date(2026, 4, 21, 18, 0);
const THURSDAY_8PM = new Date(2026, 4, 21, 20, 0);
const SATURDAY_NOON = new Date(2026, 4, 23, 12, 0);

const WEEKDAYS = {
  monday: { open: "09:00", close: "18:00" },
  tuesday: { open: "09:00", close: "18:00" },
  wednesday: { open: "09:00", close: "18:00" },
  thursday: { open: "09:00", close: "18:00" },
  friday: { open: "09:00", close: "18:00" },
};

describe("withinWorkingHours — empty / invalid hours", () => {
  it("returns true (no restriction) for null/undefined/non-object", () => {
    expect(withinWorkingHours(null, THURSDAY_10AM)).toBe(true);
    expect(withinWorkingHours(undefined, THURSDAY_10AM)).toBe(true);
    expect(withinWorkingHours("not-an-object", THURSDAY_10AM)).toBe(true);
    expect(withinWorkingHours(42, THURSDAY_10AM)).toBe(true);
  });
});

describe("withinWorkingHours — schedule matching", () => {
  it("returns true when current day's block contains the current time", () => {
    expect(withinWorkingHours(WEEKDAYS, THURSDAY_10AM)).toBe(true);
  });

  it("returns false when there is no block for the current day", () => {
    expect(withinWorkingHours({ monday: { open: "09:00", close: "18:00" } }, THURSDAY_10AM)).toBe(
      false,
    );
  });

  it("returns false on a weekend day when only weekdays are configured", () => {
    expect(withinWorkingHours(WEEKDAYS, SATURDAY_NOON)).toBe(false);
  });
});

describe("withinWorkingHours — time bounds", () => {
  it("returns false when the current time is before the open time", () => {
    expect(withinWorkingHours({ thursday: { open: "11:00", close: "18:00" } }, THURSDAY_10AM)).toBe(
      false,
    );
  });

  it("returns false when the current time is after the close time", () => {
    expect(withinWorkingHours({ thursday: { open: "09:00", close: "19:00" } }, THURSDAY_8PM)).toBe(
      false,
    );
  });

  it("treats the close time as exclusive (right at close = closed)", () => {
    expect(withinWorkingHours({ thursday: { open: "09:00", close: "18:00" } }, THURSDAY_6PM)).toBe(
      false,
    );
  });
});

describe("withinWorkingHours — degenerate blocks", () => {
  it("rejects a null block for the current day", () => {
    expect(withinWorkingHours({ thursday: null }, THURSDAY_10AM)).toBe(false);
  });

  it("rejects a block missing the close time", () => {
    expect(withinWorkingHours({ thursday: { open: "09:00" } }, THURSDAY_10AM)).toBe(false);
  });

  it("rejects a block missing the open time", () => {
    expect(withinWorkingHours({ thursday: { close: "18:00" } }, THURSDAY_10AM)).toBe(false);
  });
});
