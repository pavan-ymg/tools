// §3.6.3: "exponential backoff after ~5 failures... not a permanent
// lock" — deliberately not a hard lockout, since that would let anyone
// lock a colleague out by guessing their password wrong on purpose.
export const FAILED_LOGIN_THRESHOLD = 5;
const BASE_LOCKOUT_SECONDS = 30;
export const MAX_LOCKOUT_SECONDS = 15 * 60;

export function computeLockoutSeconds(failedLoginCount: number): number {
  const exponent = failedLoginCount - FAILED_LOGIN_THRESHOLD;
  return Math.min(MAX_LOCKOUT_SECONDS, BASE_LOCKOUT_SECONDS * 2 ** exponent);
}
