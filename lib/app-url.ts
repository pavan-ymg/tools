// Base URL for links we email out (invites, password resets). Never
// built from the request's Host header — that header is client-supplied,
// and a reset link built from it can be pointed at an attacker's domain
// (password-reset poisoning). APP_URL wins if set; otherwise Vercel's
// own production domain (system env, custom domain when one is set);
// otherwise local dev.
export function appBaseUrl(): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3000";
}
