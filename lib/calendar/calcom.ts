import "server-only";

import { getPrisma } from "@/lib/db/client";
import type { OrgId } from "@/lib/db/types";
import { envOr, optionalEnv, requireEnv } from "@/lib/env";

const CALCOM_BASE = envOr("CALCOM_API_BASE", "https://api.cal.com/v2");
const CALCOM_AUTHORIZE_BASE = envOr("CALCOM_AUTHORIZE_BASE", "https://app.cal.com");
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

export function getAuthorizeUrl(args: { state: string; redirectUri: string }): string {
  const clientId = requireEnv("CALCOM_CLIENT_ID");
  const url = new URL(`/oauth/${clientId}/authorize`, CALCOM_AUTHORIZE_BASE);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", args.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", args.state);
  return url.toString();
}

interface OAuthTokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  data?: {
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresAt?: number | string;
  };
}

async function postOAuthToken(body: Record<string, string>): Promise<OAuthTokenResponse> {
  const clientId = requireEnv("CALCOM_CLIENT_ID");
  const res = await fetch(`${CALCOM_BASE}/oauth/${clientId}/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "cal-api-version": API_VERSION,
    },
    body: new URLSearchParams(body).toString(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Cal.com OAuth token endpoint returned ${res.status}: ${text.slice(0, 200)}`);
  }
  return (await res.json()) as OAuthTokenResponse;
}

function parseTokens(json: OAuthTokenResponse): {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
} {
  const accessToken = json.access_token ?? json.data?.accessToken;
  const refreshToken = json.refresh_token ?? json.data?.refreshToken;
  if (!accessToken || !refreshToken) {
    throw new Error("Cal.com token response missing access_token or refresh_token.");
  }
  let expiresAt: Date;
  if (json.expires_in) {
    expiresAt = new Date(Date.now() + json.expires_in * 1000);
  } else if (json.data?.accessTokenExpiresAt != null) {
    const raw = json.data.accessTokenExpiresAt;
    const ms = typeof raw === "number" ? raw : new Date(raw).getTime();
    expiresAt = new Date(ms);
  } else {
    expiresAt = new Date(Date.now() + 55 * 60 * 1000);
  }
  return { accessToken, refreshToken, expiresAt };
}

interface MeResponse {
  data?: { id?: number; email?: string; timeZone?: string };
  id?: number;
  email?: string;
  timeZone?: string;
}

async function fetchMe(accessToken: string): Promise<{
  id: number;
  email: string;
  timezone: string;
}> {
  const res = await fetch(`${CALCOM_BASE}/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "cal-api-version": API_VERSION,
    },
  });
  if (!res.ok) {
    throw new Error(`Cal.com /me returned ${res.status}`);
  }
  const json = (await res.json()) as MeResponse;
  const id = json.data?.id ?? json.id;
  const email = json.data?.email ?? json.email;
  const timezone = json.data?.timeZone ?? json.timeZone ?? "America/Sao_Paulo";
  if (!id || !email) throw new Error("Cal.com /me returned no id/email.");
  return { id, email, timezone };
}

export async function exchangeAuthCodeAndStore(args: {
  orgId: OrgId;
  code: string;
  redirectUri: string;
}): Promise<void> {
  const json = await postOAuthToken({
    grant_type: "authorization_code",
    code: args.code,
    redirect_uri: args.redirectUri,
    client_id: requireEnv("CALCOM_CLIENT_ID"),
    client_secret: requireEnv("CALCOM_CLIENT_SECRET"),
  });
  const tokens = parseTokens(json);
  const me = await fetchMe(tokens.accessToken);

  await getPrisma().calcomConnection.upsert({
    where: { orgId: args.orgId },
    create: {
      orgId: args.orgId,
      calcomUserId: me.id,
      managedUserEmail: me.email,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
      timezone: me.timezone,
    },
    update: {
      calcomUserId: me.id,
      managedUserEmail: me.email,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
    },
  });
}

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

  const json = await postOAuthToken({
    grant_type: "refresh_token",
    refresh_token: conn.refreshToken,
    client_id: requireEnv("CALCOM_CLIENT_ID"),
    client_secret: requireEnv("CALCOM_CLIENT_SECRET"),
  });
  const tokens = parseTokens(json);
  await prisma.calcomConnection.update({
    where: { orgId },
    data: {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
    },
  });
  return {
    accessToken: tokens.accessToken,
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
