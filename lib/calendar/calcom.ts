import "server-only";

import { getPrisma } from "@/lib/db/client";
import type { OrgId } from "@/lib/db/types";
import { envOr } from "@/lib/env";

const CALCOM_BASE = envOr("CALCOM_API_BASE", "https://api.cal.com/v2");
const API_VERSION = "2026-02-25";

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

async function callApi<T>(path: string, init: RequestInit, apiKey: string): Promise<T> {
  const res = await fetch(`${CALCOM_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "cal-api-version": API_VERSION,
      ...(init.headers as Record<string, string> | undefined),
    },
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Cal.com ${res.status} ${path}: ${errText.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

interface MeResponse {
  data?: { id?: number; email?: string; timeZone?: string };
  id?: number;
  email?: string;
  timeZone?: string;
}

interface ValidateResult {
  email: string;
  timezone: string;
}

/**
 * Validate the API key by calling `/me`. Returns the authenticated user's
 * email and timezone so we can store them for display.
 */
export async function validateApiKey(apiKey: string): Promise<ValidateResult> {
  const json = await callApi<MeResponse>("/me", { method: "GET" }, apiKey);
  const email = json.data?.email ?? json.email;
  const timezone = json.data?.timeZone ?? json.timeZone ?? "America/Sao_Paulo";
  if (!email) throw new Error("Cal.com /me returned no email.");
  return { email, timezone };
}

async function loadConnection(orgId: OrgId): Promise<{
  apiKey: string;
  eventTypeId: number | null;
  timezone: string;
}> {
  const conn = await getPrisma().calcomConnection.findUnique({ where: { orgId } });
  if (!conn) throw new CalcomNotConfiguredError();
  return {
    apiKey: conn.apiKey,
    eventTypeId: conn.defaultEventTypeId,
    timezone: conn.timezone,
  };
}

interface CalcomEventType {
  id: number;
  title: string;
  slug: string;
  lengthInMinutes: number;
}

export async function listEventTypes(orgId: OrgId): Promise<CalcomEventType[]> {
  const conn = await loadConnection(orgId);
  const data = await callApi<{ data: CalcomEventType[] }>(
    "/event-types",
    { method: "GET" },
    conn.apiKey,
  );
  return data.data ?? [];
}

export const calcom = {
  async getAvailableSlots(input: AvailabilityInput) {
    const conn = await loadConnection(input.orgId);
    if (!conn.eventTypeId) {
      throw new Error("No default event type configured for this org.");
    }

    const url = new URL("/slots/available", CALCOM_BASE);
    url.searchParams.set("eventTypeId", String(conn.eventTypeId));
    url.searchParams.set("startTime", input.fromIso);
    url.searchParams.set("endTime", input.toIso);
    url.searchParams.set("timeZone", conn.timezone);

    interface CalcomSlotsResponse {
      data?: { slots?: Record<string, Array<{ time: string }>> };
    }

    const data = await callApi<CalcomSlotsResponse>(
      `${url.pathname}${url.search}`,
      { method: "GET" },
      conn.apiKey,
    );

    const out: Array<{ start: string; end: string }> = [];
    for (const day of Object.values(data.data?.slots ?? {})) {
      for (const slot of day ?? []) {
        const start = new Date(slot.time);
        const end = new Date(start.getTime() + input.durationMin * 60 * 1000);
        out.push({ start: start.toISOString(), end: end.toISOString() });
      }
    }
    return out;
  },

  async bookAppointment(input: BookInput): Promise<{ id: string; status: string }> {
    const conn = await loadConnection(input.orgId);
    if (!conn.eventTypeId) {
      throw new Error("No default event type configured for this org.");
    }

    interface CalcomBookingResponse {
      data: { id: number; status: string };
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

    const data = await callApi<CalcomBookingResponse>(
      "/bookings",
      { method: "POST", body: JSON.stringify(body) },
      conn.apiKey,
    );
    return { id: String(data.data.id), status: data.data.status };
  },
};
