import type { CallDirection, CallOutcome, CallStatus, Prisma, Sentiment } from "@prisma/client";

export const CALL_STATUS_VALUES: CallStatus[] = [
  "RINGING",
  "IN_PROGRESS",
  "COMPLETED",
  "FAILED",
  "NO_ANSWER",
  "VOICEMAIL",
];

export const CALL_OUTCOME_VALUES: CallOutcome[] = [
  "SCHEDULED",
  "QUALIFIED",
  "TRANSFERRED",
  "NOT_QUALIFIED",
  "NO_ANSWER",
  "OTHER",
];

export const SENTIMENT_VALUES: Sentiment[] = ["POSITIVE", "NEUTRAL", "NEGATIVE", "MIXED"];

export const CALL_DIRECTION_VALUES: CallDirection[] = ["INBOUND", "OUTBOUND"];

export const DATE_RANGE_VALUES = ["1d", "7d", "30d", "90d", "all"] as const;
export type DateRange = (typeof DATE_RANGE_VALUES)[number];

const RANGE_TO_DAYS: Record<Exclude<DateRange, "all">, number> = {
  "1d": 1,
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface CallFilters {
  search: string | null;
  status: CallStatus | null;
  outcome: CallOutcome | null;
  sentiment: Sentiment | null;
  direction: CallDirection | null;
  range: DateRange;
}

export interface CallSearchParams {
  q?: string;
  status?: string;
  outcome?: string;
  sentiment?: string;
  direction?: string;
  range?: string;
  page?: string;
}

function asMember<T extends string>(value: string | undefined, members: readonly T[]): T | null {
  if (!value) return null;
  return members.includes(value as T) ? (value as T) : null;
}

export function parseCallFilters(params: CallSearchParams): CallFilters {
  const search = params.q?.trim() ? params.q.trim() : null;
  const range = asMember(params.range, DATE_RANGE_VALUES) ?? "all";
  return {
    search,
    status: asMember(params.status, CALL_STATUS_VALUES),
    outcome: asMember(params.outcome, CALL_OUTCOME_VALUES),
    sentiment: asMember(params.sentiment, SENTIMENT_VALUES),
    direction: asMember(params.direction, CALL_DIRECTION_VALUES),
    range,
  };
}

export function hasActiveFilters(filters: CallFilters): boolean {
  return (
    filters.search != null ||
    filters.status != null ||
    filters.outcome != null ||
    filters.sentiment != null ||
    filters.direction != null ||
    filters.range !== "all"
  );
}

/**
 * Builds the Prisma `where` for the calls list from parsed filters. The
 * tenant `orgId` is injected by `getDb`, so it is intentionally absent here.
 * `now` is injectable to keep the date-range math deterministic in tests.
 */
export function buildCallWhere(
  filters: CallFilters,
  now: Date = new Date(),
): Prisma.CallWhereInput {
  const where: Prisma.CallWhereInput = {};

  if (filters.status) where.status = filters.status;
  if (filters.outcome) where.outcome = filters.outcome;
  if (filters.sentiment) where.sentiment = filters.sentiment;
  if (filters.direction) where.direction = filters.direction;

  if (filters.range !== "all") {
    const start = new Date(now.getTime() - RANGE_TO_DAYS[filters.range] * MS_PER_DAY);
    where.startedAt = { gte: start };
  }

  if (filters.search) {
    const term = filters.search;
    where.OR = [
      { callerE164: { contains: term, mode: "insensitive" } },
      { calleeE164: { contains: term, mode: "insensitive" } },
      { campaignAttempt: { lead: { name: { contains: term, mode: "insensitive" } } } },
    ];
  }

  return where;
}

/** Builds clean `URLSearchParams` from raw page params, dropping empty values. */
export function searchParamsToQuery(params: CallSearchParams): URLSearchParams {
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== "") usp.set(key, value);
  }
  return usp;
}
