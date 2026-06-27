import { describe, expect, it } from "vitest";

import { bookingDayKey, formatBookingTime, formatDayLabel, groupBookingsByDay } from "./format";

const SAO_PAULO = "America/Sao_Paulo";

describe("bookingDayKey", () => {
  it("uses the org timezone, not UTC, for the local day", () => {
    const lateNightUtc = new Date("2026-06-28T02:30:00Z");

    expect(bookingDayKey(lateNightUtc, SAO_PAULO)).toBe("2026-06-27");
    expect(bookingDayKey(lateNightUtc, "UTC")).toBe("2026-06-28");
  });
});

describe("formatBookingTime", () => {
  it("renders 24h HH:mm in the org timezone", () => {
    const instant = new Date("2026-06-27T17:30:00Z");

    expect(formatBookingTime(instant, SAO_PAULO)).toBe("14:30");
  });
});

describe("formatDayLabel", () => {
  it("renders weekday, day and month in the given timezone and locale", () => {
    const instant = new Date("2026-06-27T17:30:00Z");

    expect(formatDayLabel(instant, SAO_PAULO, "en-US")).toBe("Sat 27 Jun");
  });
});

describe("groupBookingsByDay", () => {
  const now = new Date("2026-06-27T12:00:00Z");

  it("groups by local day and sorts groups and rows ascending", () => {
    const bookings = [
      { start: new Date("2026-06-28T13:00:00Z"), item: "tomorrow-pm" },
      { start: new Date("2026-06-27T20:00:00Z"), item: "today-late" },
      { start: new Date("2026-06-27T17:30:00Z"), item: "today-early" },
    ];

    const groups = groupBookingsByDay(bookings, SAO_PAULO, "en-US", now);

    expect(groups.map((group) => group.dayKey)).toEqual(["2026-06-27", "2026-06-28"]);
    expect(groups.map((group) => group.items)).toEqual([
      ["today-early", "today-late"],
      ["tomorrow-pm"],
    ]);
  });

  it("tags today and tomorrow relative to the injected now", () => {
    const bookings = [
      { start: new Date("2026-06-27T17:30:00Z"), item: "a" },
      { start: new Date("2026-06-28T17:30:00Z"), item: "b" },
      { start: new Date("2026-06-30T17:30:00Z"), item: "c" },
    ];

    const groups = groupBookingsByDay(bookings, SAO_PAULO, "en-US", now);

    expect(groups.map((group) => group.relative)).toEqual(["today", "tomorrow", "other"]);
  });
});
