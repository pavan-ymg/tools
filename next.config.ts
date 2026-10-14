import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  /* config options here */
};

export default withSentryConfig(nextConfig, {
  org: "ymg-legal",
  project: "tools",
  silent: true,
  widenClientFileUpload: true,
});
