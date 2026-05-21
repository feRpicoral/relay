import type { ErrorEvent, EventHint } from "@sentry/nextjs";

/**
 * Pieces of Sentry config that don't vary between the three runtimes
 * (client/server/edge). Each sentry.*.config.ts file applies these on top of
 * its own runtime-specific options.
 */

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

export function getSentryDsn(): string | undefined {
  return dsn;
}

/**
 * Distinguishes prod / preview / development in the Sentry UI so we can filter
 * noise. Pulled from NODE_ENV plus the Vercel-provided env when available.
 */
export function getSentryEnvironment(): string {
  if (process.env.VERCEL_ENV) return process.env.VERCEL_ENV;
  return process.env.NODE_ENV ?? "development";
}

/**
 * Per-org tenant fields, phone numbers, and tokens can land in errors when
 * something fails mid-pipeline. We strip them before transmission.
 *
 * This is conservative: we redact rather than drop the event, so we still see
 * the error shape.
 */
export function scrubPii(event: ErrorEvent, _hint: EventHint): ErrorEvent | null {
  if (event.request?.headers) {
    delete event.request.headers["authorization"];
    delete event.request.headers["cookie"];
    delete event.request.headers["x-twilio-signature"];
  }
  if (event.request?.cookies) {
    event.request.cookies = {};
  }
  if (event.user) {
    // Keep the id for correlation, drop email/ip.
    event.user = event.user.id ? { id: event.user.id } : undefined;
  }
  // Stack frames and extra data sometimes hold tokens; replace common patterns.
  const json = JSON.stringify(event);
  const scrubbed = json
    .replace(
      /("?(?:authToken|apiKey|apiKeyEncrypted|secret|token|password)"?\s*:\s*")[^"]+(")/gi,
      "$1[redacted]$2",
    )
    // Phone numbers in tool/event payloads.
    .replace(/(\+[1-9]\d{6,17})/g, "[phone-redacted]");
  if (scrubbed !== json) {
    return JSON.parse(scrubbed) as ErrorEvent;
  }
  return event;
}
