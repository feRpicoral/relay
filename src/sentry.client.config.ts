import * as Sentry from "@sentry/nextjs";

import { getSentryDsn, getSentryEnvironment, scrubPii } from "@/lib/sentry/config";

const dsn = getSentryDsn();

if (dsn) {
  Sentry.init({
    dsn,
    environment: getSentryEnvironment(),
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1,
    integrations: [Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true })],
    beforeSend: scrubPii,
  });
}
