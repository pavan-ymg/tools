import * as Sentry from "@sentry/nextjs";

// Same setup as HRMS. Unset SENTRY_DSN = Sentry is a no-op. Added after
// the Lead Feed sync sat broken in production unnoticed (§5.17) — the
// app degraded gracefully, so nothing surfaced until someone saw the banner.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" || process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 0.2,
      // No sendDefaultPii — leads carry real names/phones/emails.
    });
  }
}

export const onRequestError = Sentry.captureRequestError;
