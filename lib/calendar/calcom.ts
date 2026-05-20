import "server-only";

import { getPrisma } from "@/lib/db/client";
import type { OrgId } from "@/lib/db/types";
import { envOr, optionalEnv, requireEnv } from "@/lib/env";

const CALCOM_BASE = envOr("CALCOM_API_BASE", "https://api.cal.com/v2");
const API_VERSION = "2024-08-13";

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

async function platformAuthHeaders() {
  return {
    "Content-Type": "application/json",
    "x-cal-secret-key": requireEnv("CALCOM_CLIENT_SECRET"),
    "x-cal-client-id": requireEnv("CALCOM_CLIENT_ID"),
    "cal-api-version": API_VERSION,
  };
}

/**
 * Ensure the connection's access token is fresh. Refreshes if within 60s of
 * expiry. Returns the (possibly refreshed) access token.
 */
async function freshAccessToken(orgId: OrgId): Promise<{
  accessToken: string;
  eventTypeId: number | null;
  timezone: string;
}> {
  const prisma = getPrisma();
  const conn = await prisma.calcomConnection.findUnique({ where: { orgId } });
  if (!conn) throw new CalcomNotConfiguredError();

  const expiringSoon = conn.expiresAt.getTime() - Date.now() < 60_000;
  if (!expiringSoon) {
    return {
      accessToken: conn.accessToken,
      eventTypeId: conn.defaultEventTypeId,
      timezone: conn.timezone,
    };
  }

  const clientId = requireEnv("CALCOM_CLIENT_ID");
  const res = await fetch(`${CALCOM_BASE}/oauth/${clientId}/refresh`, {
    method: "POST",
    headers: await platformAuthHeaders(),
    body: JSON.stringify({ refreshToken: conn.refreshToken }),
  });
  if (!res.ok) {
    throw new Error(`Cal.com token refresh failed: ${res.status}`);
  }
  const json = (await res.json()) as {
    data?: { accessToken: string; refreshToken: string; expiresAt?: string };
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpiresAt?: string;
  };
  const accessToken = json.data?.accessToken ?? json.accessToken;
  const refreshToken = json.data?.refreshToken ?? json.refreshToken;
  if (!accessToken || !refreshToken) {
    throw new Error("Cal.com token refresh returned no tokens.");
  }
  const expiresAt = new Date(
    json.data?.expiresAt ?? json.accessTokenExpiresAt ?? Date.now() + 50 * 60 * 1000,
  );
  await prisma.calcomConnection.update({
    where: { orgId },
    data: { accessToken, refreshToken, expiresAt },
  });
  return {
    accessToken,
    eventTypeId: conn.defaultEventTypeId,
    timezone: conn.timezone,
  };
}

async function callApi<T>(path: string, init: RequestInit, accessToken: string): Promise<T> {
  const res = await fetch(`${CALCOM_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
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

interface ManagedUserResponse {
  status?: string;
  data: {
    user: { id: number; email: string };
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresAt?: string | number;
  };
}

/**
 * Create a Cal.com Platform managed user for this org and persist the resulting
 * tokens. The clinic admin clicks "Connect Cal.com" and we create their managed
 * user behind the scenes using the platform credentials.
 */
export async function provisionCalcomManagedUser(args: {
  orgId: OrgId;
  email: string;
  name: string;
  timezone?: string;
}): Promise<{ calcomUserId: number; expiresAt: Date }> {
  const clientId = requireEnv("CALCOM_CLIENT_ID");
  const res = await fetch(`${CALCOM_BASE}/oauth/${clientId}/users`, {
    method: "POST",
    headers: await platformAuthHeaders(),
    body: JSON.stringify({
      email: args.email,
      name: args.name,
      timeZone: args.timezone ?? "America/Sao_Paulo",
      locale: "pt-BR",
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Cal.com managed-user create failed: ${res.status} ${text.slice(0, 200)}`);
  }
  const json = (await res.json()) as ManagedUserResponse;
  const expiresAt = new Date(
    json.data.accessTokenExpiresAt
      ? typeof json.data.accessTokenExpiresAt === "number"
        ? json.data.accessTokenExpiresAt
        : new Date(json.data.accessTokenExpiresAt).getTime()
      : Date.now() + 50 * 60 * 1000,
  );

  await getPrisma().calcomConnection.upsert({
    where: { orgId: args.orgId },
    create: {
      orgId: args.orgId,
      calcomUserId: json.data.user.id,
      managedUserEmail: json.data.user.email,
      accessToken: json.data.accessToken,
      refreshToken: json.data.refreshToken,
      expiresAt,
      timezone: args.timezone ?? "America/Sao_Paulo",
    },
    update: {
      calcomUserId: json.data.user.id,
      managedUserEmail: json.data.user.email,
      accessToken: json.data.accessToken,
      refreshToken: json.data.refreshToken,
      expiresAt,
    },
  });

  return { calcomUserId: json.data.user.id, expiresAt };
}

interface CalcomEventType {
  id: number;
  title: string;
  slug: string;
  lengthInMinutes: number;
}

export async function listEventTypes(orgId: OrgId): Promise<CalcomEventType[]> {
  const tok = await freshAccessToken(orgId);
  const data = await callApi<{ data: CalcomEventType[] }>(
    "/event-types",
    { method: "GET" },
    tok.accessToken,
  );
  return data.data ?? [];
}

export const calcom = {
  async getAvailableSlots(input: AvailabilityInput) {
    const tok = await freshAccessToken(input.orgId);
    if (!tok.eventTypeId) {
      throw new Error("No default event type configured for this org.");
    }

    const url = new URL("/slots/available", CALCOM_BASE);
    url.searchParams.set("eventTypeId", String(tok.eventTypeId));
    url.searchParams.set("startTime", input.fromIso);
    url.searchParams.set("endTime", input.toIso);
    url.searchParams.set("timeZone", tok.timezone);

    interface CalcomSlotsResponse {
      data?: { slots?: Record<string, Array<{ time: string }>> };
    }

    const data = await callApi<CalcomSlotsResponse>(
      `${url.pathname}${url.search}`,
      { method: "GET" },
      tok.accessToken,
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
    const tok = await freshAccessToken(input.orgId);
    if (!tok.eventTypeId) {
      throw new Error("No default event type configured for this org.");
    }

    interface CalcomBookingResponse {
      data: { id: number; status: string };
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

    const data = await callApi<CalcomBookingResponse>(
      "/bookings",
      { method: "POST", body: JSON.stringify(body) },
      tok.accessToken,
    );
    return { id: String(data.data.id), status: data.data.status };
  },
};

export function isCalcomConfigured(): boolean {
  return (
    optionalEnv("CALCOM_CLIENT_ID") !== undefined &&
    optionalEnv("CALCOM_CLIENT_SECRET") !== undefined
  );
}
