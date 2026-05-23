import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

/**
 * Next.js 14+ forwards uncaught errors from RSCs, route handlers, and Server
 * Actions here. Without explicitly forwarding to Sentry, those errors don't
 * land in the error tracker.
 */
export const onRequestError = Sentry.captureRequestError;
