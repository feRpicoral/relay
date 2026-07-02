/**
 * Timezone-aware formatting and grouping for the read-only calendar view.
 *
 * Bookings are stored as ISO instants (UTC) inside `book_appointment` tool-call
 * rows. The calendar groups and labels them in the org's timezone, so two
 * bookings near midnight UTC land on the correct local day.
 */

export type RelativeDay = "today" | "tomorrow" | "other";

export interface BookingDayGroup<T> {
  /** Local `YYYY-MM-DD` key in the org timezone; stable sort key for the day. */
  dayKey: string;
  relative: RelativeDay;
  /** Localized weekday + day + month, e.g. "Fri 27 Jun". */
  label: string;
  items: T[];
}

/** Local `YYYY-MM-DD` for an instant in the given timezone (sortable, locale-free). */
export function bookingDayKey(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** "HH:mm" (24h) for an instant in the given timezone. */
export function formatBookingTime(date: Date, timeZone: string, locale = "en-US"): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

/**
 * Localized weekday + day + month for a day header, composed as
 * "weekday day month" (e.g. "Fri 27 Jun") so the order stays stable across
 * locales instead of following each locale's default month/day ordering.
 */
export function formatDayLabel(date: Date, timeZone: string, locale = "en-US"): string {
  const parts = new Intl.DateTimeFormat(locale, {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${get("weekday")} ${get("day")} ${get("month")}`;
}

function relativeDay(dayKey: string, todayKey: string, tomorrowKey: string): RelativeDay {
  if (dayKey === todayKey) return "today";
  if (dayKey === tomorrowKey) return "tomorrow";
  return "other";
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Group bookings by their local day, ascending. Each booking carries its parsed
 * instant; groups and rows are sorted earliest-first. `now` is injectable for
 * deterministic tests.
 */
export function groupBookingsByDay<T>(
  bookings: Array<{ start: Date; item: T }>,
  timeZone: string,
  locale = "en-US",
  now: Date = new Date(),
): Array<BookingDayGroup<T>> {
  const todayKey = bookingDayKey(now, timeZone);
  const tomorrowKey = bookingDayKey(new Date(now.getTime() + MS_PER_DAY), timeZone);

  const groups = new Map<string, BookingDayGroup<T>>();
  const sorted = [...bookings].sort((a, b) => a.start.getTime() - b.start.getTime());

  for (const { start, item } of sorted) {
    const dayKey = bookingDayKey(start, timeZone);
    let group = groups.get(dayKey);
    if (!group) {
      group = {
        dayKey,
        relative: relativeDay(dayKey, todayKey, tomorrowKey),
        label: formatDayLabel(start, timeZone, locale),
        items: [],
      };
      groups.set(dayKey, group);
    }
    group.items.push(item);
  }

  return [...groups.values()].sort((a, b) => a.dayKey.localeCompare(b.dayKey));
}
