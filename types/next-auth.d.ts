import { DefaultSession } from "next-auth";

// Session/JWT carry identity only (userId + role slugs as UI hints) —
// never permissions. Permissions resolve server-side per request via
// lib/permissions.ts so a revocation takes effect immediately instead
// of surviving until the token expires (§3.6.3).
declare module "next-auth" {
  interface User {
    roles?: string[];
    sessionVersion?: number;
  }
  interface Session {
    user: {
      id: string;
      roles: string[];
      sessionVersion: number;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    roles?: string[];
    sessionVersion?: number;
  }
}
