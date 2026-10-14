import { afterEach, describe, expect, it, vi } from "vitest";
import { appBaseUrl } from "@/lib/app-url";

afterEach(() => vi.unstubAllEnvs());

describe("appBaseUrl", () => {
  it("prefers APP_URL and strips a trailing slash", () => {
    vi.stubEnv("APP_URL", "https://tools.ymg-legal.com/");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "other.example.com");
    expect(appBaseUrl()).toBe("https://tools.ymg-legal.com");
  });

  it("falls back to Vercel's production domain", () => {
    vi.stubEnv("APP_URL", "");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "tools.ymg-legal.com");
    expect(appBaseUrl()).toBe("https://tools.ymg-legal.com");
  });

  it("falls back to localhost in dev", () => {
    vi.stubEnv("APP_URL", "");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "");
    expect(appBaseUrl()).toBe("http://localhost:3000");
  });
});
