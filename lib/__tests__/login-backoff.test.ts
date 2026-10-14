import { describe, expect, it } from "vitest";
import { FAILED_LOGIN_THRESHOLD, MAX_LOCKOUT_SECONDS, computeLockoutSeconds } from "@/lib/login-backoff";

describe("computeLockoutSeconds", () => {
  it("starts at 30s on the threshold failure and doubles", () => {
    expect(computeLockoutSeconds(FAILED_LOGIN_THRESHOLD)).toBe(30);
    expect(computeLockoutSeconds(FAILED_LOGIN_THRESHOLD + 1)).toBe(60);
    expect(computeLockoutSeconds(FAILED_LOGIN_THRESHOLD + 2)).toBe(120);
  });

  it("caps at 15 minutes — backoff, never a permanent lock", () => {
    expect(computeLockoutSeconds(FAILED_LOGIN_THRESHOLD + 50)).toBe(MAX_LOCKOUT_SECONDS);
  });
});
