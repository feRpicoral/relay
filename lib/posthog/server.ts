import "server-only";

import { PostHog } from "posthog-node";

let cached: PostHog | null = null;

export function getPostHog(): PostHog | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return null;
  if (!cached) {
    cached = new PostHog(key, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return cached;
}

export async function capture(
  event: string,
  distinctId: string,
  properties?: Record<string, unknown>,
) {
  const client = getPostHog();
  if (!client) return;
  client.capture({ distinctId, event, properties });
  await client.flush().catch(() => undefined);
}
