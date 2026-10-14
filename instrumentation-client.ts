import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.2,
  // No session replay — the Lead Feed and intake forms render real
  // prospect contact data; not worth recording that to a third party.
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
