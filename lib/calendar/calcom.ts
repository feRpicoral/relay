import "server-only";

import { getPrisma } from "@/lib/db/client";
import type { OrgId } from "@/lib/db/types";
import { envOr, optionalEnv } from "@/lib/env";

const CALCOM_BASE = envOr("CALCOM_API_BASE", "https://api.cal.com/v2");

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

async function tokenFor(orgId: OrgId): Promise<{
  accessToken: string;
  eventTypeId: number | null;
  timezone: string;
} | null> {
  const conn = await getPrisma().calcomConnection.findUnique({ where: { orgId } });
  if (!conn) return null;
  return {
    accessToken: conn.accessToken,
    eventTypeId: conn.defaultEventTypeId,
    timezone: conn.timezone,
  };
}

async function call<T>(path: string, init: RequestInit, accessToken: string): Promise<T | null> {
  const res = await fetch(`${CALCOM_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      "cal-api-version": "2024-08-13",
      ...(init.headers as Record<string, string> | undefined),
    },
  });
  if (!res.ok) {
    console.warn("[calcom] non-200", res.status, path);
    return null;
  }
  return (await res.json()) as T;
}

async function fakeAvailability(input: AvailabilityInput) {
  // No Cal.com connection yet — return a few synthetic slots so the agent can
  // still demo. Each slot is on the next business hour boundary.
  const from = new Date(input.fromIso);
  const slots: Array<{ start: string; end: string }> = [];
  let cursor = new Date(from);
  cursor.setMinutes(0, 0, 0);
  cursor = new Date(cursor.getTime() + 60 * 60 * 1000);
  for (let i = 0; i < 5; i += 1) {
    const start = new Date(cursor.getTime() + i * 60 * 60 * 1000);
    const end = new Date(start.getTime() + input.durationMin * 60 * 1000);
    slots.push({ start: start.toISOString(), end: end.toISOString() });
  }
  return slots;
}

export const calcom = {
  async getAvailableSlots(input: AvailabilityInput) {
    const tok = await tokenFor(input.orgId);
    if (!tok || !tok.eventTypeId) return fakeAvailability(input);

    const url = new URL("/slots/available", CALCOM_BASE);
    url.searchParams.set("eventTypeId", String(tok.eventTypeId));
    url.searchParams.set("startTime", input.fromIso);
    url.searchParams.set("endTime", input.toIso);
    url.searchParams.set("timeZone", tok.timezone);

    interface CalcomSlotsResponse {
      data?: { slots?: Record<string, Array<{ time: string }>> };
    }

    const data = await call<CalcomSlotsResponse>(
      `${url.pathname}${url.search}`,
      { method: "GET" },
      tok.accessToken,
    );
    if (!data?.data?.slots) return fakeAvailability(input);

    const out: Array<{ start: string; end: string }> = [];
    for (const day of Object.values(data.data.slots)) {
      for (const slot of day ?? []) {
        const start = new Date(slot.time);
        const end = new Date(start.getTime() + input.durationMin * 60 * 1000);
        out.push({ start: start.toISOString(), end: end.toISOString() });
      }
    }
    return out;
  },

  async bookAppointment(input: BookInput): Promise<{ id: string; status: string }> {
    const tok = await tokenFor(input.orgId);
    if (!tok || !tok.eventTypeId) {
      return { id: `pending-${Date.now()}`, status: "PENDING_CONNECTION" };
    }

    interface CalcomBookingResponse {
      data?: { id: number; status: string };
    }
    const body = {
      start: input.slotIso,
      eventTypeId: tok.eventTypeId,
      attendee: {
        name: input.patientName,
        phoneNumber: input.patientPhone,
        timeZone: tok.timezone,
        language: "pt",
      },
      bookingFieldsResponses: {
        notes: input.reason ?? "",
      },
    };

    const data = await call<CalcomBookingResponse>(
      "/bookings",
      { method: "POST", body: JSON.stringify(body) },
      tok.accessToken,
    );
    if (!data?.data) return { id: `failed-${Date.now()}`, status: "FAILED" };
    return { id: String(data.data.id), status: data.data.status };
  },
};

export function isCalcomConfigured(): boolean {
  return optionalEnv("CALCOM_CLIENT_ID") !== undefined;
}
