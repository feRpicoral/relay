import { z } from "zod";

import { DEFAULT_TIMEZONE } from "@/lib/constants";
import { decryptSecret } from "@/lib/crypto";
import { getPrisma } from "@/lib/db/client";
import type { OrgId } from "@/lib/db/types";
import { envOr } from "@/lib/env";

const CALCOM_BASE = envOr("CALCOM_API_BASE", "https://api.cal.com/v2");
// Cal.com versions each endpoint independently via the cal-api-version header.
// Omitting it returns a legacy shape (object-wrapped instead of flat array),
// which is what triggered `b.map is not a function` on the event-type picker.
const EVENT_TYPES_API_VERSION = "2024-06-14";
const SLOTS_API_VERSION = "2024-09-04";

/**
 * Cap any Cal.com request: the worker can't block a live call on a slow third
 * party. 5s is generous for an availability check and tight enough that the
 * caller can fall back gracefully.
 */
const CALCOM_TIMEOUT_MS = 5_000;

interface AvailabilityInput {
  orgId: OrgId;
  fromIso: string;
  toIso: string;
  durationMin: number;
}

interface BookInput {
  orgId: OrgId;
  slotIso: string;
  durationMin: number;
  patientName: string;
  patientPhone: string;
  reason?: string;
}

export class CalcomNotConfiguredError extends Error {
  constructor() {
    super("calcom_not_configured");
    this.name = "CalcomNotConfiguredError";
  }
}

export class CalcomError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "CalcomError";
  }
}

async function callApi<T>(
  path: string,
  init: RequestInit,
  apiKey: string,
  schema: z.ZodType<T>,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${CALCOM_BASE}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        ...(init.headers as Record<string, string> | undefined),
      },
      signal: AbortSignal.timeout(CALCOM_TIMEOUT_MS),
    });
  } catch (err) {
    // `AbortSignal.timeout` throws a TimeoutError DOMException; surface it
    // as a typed CalcomError so callers can map to a user-facing message.
    if (err instanceof Error && err.name === "TimeoutError") {
      throw new CalcomError(`Cal.com ${path} timed out after ${CALCOM_TIMEOUT_MS}ms`);
    }
    throw new CalcomError(
      `Cal.com ${path} network error: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new CalcomError(`Cal.com ${res.status} ${path}: ${errText.slice(0, 200)}`, res.status);
  }
  const json: unknown = await res.json();
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    // Cal.com changed shape: log enough to diagnose, throw a typed error so
    // callers don't get a confusing TypeScript-level "looks right" undefined.
    console.warn("[calcom] response shape mismatch", { path, issues: parsed.error.issues });
    throw new CalcomError(`Cal.com ${path} returned unexpected shape`);
  }
  return parsed.data;
}

const MeResponseSchema = z.object({
  data: z
    .object({
      id: z.number().optional(),
      email: z.string().optional(),
      timeZone: z.string().optional(),
    })
    .optional(),
  id: z.number().optional(),
  email: z.string().optional(),
  timeZone: z.string().optional(),
});

interface ValidateResult {
  email: string;
  timezone: string;
}

/**
 * Validate the API key by calling `/me`. Returns the authenticated user's
 * email and timezone so we can store them for display.
 */
export async function validateApiKey(apiKey: string): Promise<ValidateResult> {
  const json = await callApi("/me", { method: "GET" }, apiKey, MeResponseSchema);
  const email = json.data?.email ?? json.email;
  const timezone = json.data?.timeZone ?? json.timeZone ?? DEFAULT_TIMEZONE;
  if (!email) throw new CalcomError("Cal.com /me returned no email.");
  return { email, timezone };
}

async function loadConnection(orgId: OrgId): Promise<{
  apiKey: string;
  eventTypeId: number | null;
  timezone: string;
}> {
  const conn = await getPrisma().calcomConnection.findUnique({ where: { orgId } });
  if (!conn || !conn.apiKeyEncrypted) throw new CalcomNotConfiguredError();
  return {
    apiKey: decryptSecret(conn.apiKeyEncrypted),
    eventTypeId: conn.defaultEventTypeId,
    timezone: conn.timezone,
  };
}

const EventTypeSchema = z.object({
  id: z.number(),
  title: z.string(),
  slug: z.string(),
  lengthInMinutes: z.number(),
});
type CalcomEventType = z.infer<typeof EventTypeSchema>;
const EventTypeListSchema = z.object({ data: z.array(EventTypeSchema).default([]) });

export async function listEventTypes(orgId: OrgId): Promise<CalcomEventType[]> {
  const conn = await loadConnection(orgId);
  const data = await callApi(
    "/event-types",
    { method: "GET", headers: { "cal-api-version": EVENT_TYPES_API_VERSION } },
    conn.apiKey,
    EventTypeListSchema,
  );
  return data.data;
}

const SlotsResponseSchema = z.object({
  data: z.record(z.string(), z.array(z.object({ start: z.string() }))).optional(),
});

const BookingResponseSchema = z.object({
  data: z.object({ id: z.number(), status: z.string() }),
});

export const calcom = {
  async getAvailableSlots(input: AvailabilityInput) {
    const conn = await loadConnection(input.orgId);
    if (!conn.eventTypeId) {
      throw new CalcomError("No default event type configured for this org.");
    }

    // GET /v2/slots in cal-api-version 2024-09-04 uses `start`, `end`, and
    // returns slots keyed by date.
    const params = new URLSearchParams({
      eventTypeId: String(conn.eventTypeId),
      start: input.fromIso,
      end: input.toIso,
      timeZone: conn.timezone,
    });

    const data = await callApi(
      `/slots?${params.toString()}`,
      { method: "GET", headers: { "cal-api-version": SLOTS_API_VERSION } },
      conn.apiKey,
      SlotsResponseSchema,
    );

    const out: Array<{ start: string; end: string }> = [];
    for (const daySlots of Object.values(data.data ?? {})) {
      for (const slot of daySlots ?? []) {
        const start = new Date(slot.start);
        const end = new Date(start.getTime() + input.durationMin * 60 * 1000);
        out.push({ start: start.toISOString(), end: end.toISOString() });
      }
    }
    return out;
  },

  async bookAppointment(input: BookInput): Promise<{ id: string; status: string }> {
    const conn = await loadConnection(input.orgId);
    if (!conn.eventTypeId) {
      throw new CalcomError("No default event type configured for this org.");
    }

    const body = {
      start: input.slotIso,
      eventTypeId: conn.eventTypeId,
      attendee: {
        name: input.patientName,
        phoneNumber: input.patientPhone,
        timeZone: conn.timezone,
        language: "pt",
      },
      bookingFieldsResponses: {
        notes: input.reason ?? "",
      },
    };

    const data = await callApi(
      "/bookings",
      { method: "POST", body: JSON.stringify(body) },
      conn.apiKey,
      BookingResponseSchema,
    );
    return { id: String(data.data.id), status: data.data.status };
  },
};
