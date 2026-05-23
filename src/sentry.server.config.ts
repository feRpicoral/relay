import * as Sentry from "@sentry/nextjs";

import { getSentryDsn, getSentryEnvironment, scrubPii } from "@/lib/sentry/config";

const dsn = getSentryDsn();

if (dsn) {
  Sentry.init({
    dsn,
    environment: getSentryEnvironment(),
    tracesSampleRate: 0.1,
    profilesSampleRate: 0.1,
    beforeSend: scrubPii,
  });
}
