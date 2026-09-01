import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { encode as defaultEncode } from "next-auth/jwt";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, userRoles, roles } from "@/db/schema";

// Weekly auto-logout, fixed to Monday midnight — not a rolling N-hour/
// N-day window (Pavan, 2026-09-01: "remove the auto logout everyday...
// make it every week... auto logout at monday specifically"). Logging
// in on ANY day only ever gets you to the NEXT Monday — a login on
// Monday itself still gets a full week out, not an immediate expiry.
function secondsUntilNextMonday(from: Date): number {
  const target = new Date(from);
  target.setHours(0, 0, 0, 0);
  const day = target.getDay(); // 0 = Sun, 1 = Mon, ... 6 = Sat
  const daysUntilNextMonday = ((1 - day + 7 - 1) % 7) + 1;
  target.setDate(target.getDate() + daysUntilNextMonday);
  return Math.floor((target.getTime() - from.getTime()) / 1000);
}

// §3.6.3: "exponential backoff after ~5 failures... not a permanent
// lock" — deliberately not a hard lockout, since that would let anyone
// lock a colleague out by guessing their password wrong on purpose.
const FAILED_LOGIN_THRESHOLD = 5;
const BASE_LOCKOUT_SECONDS = 30;
const MAX_LOCKOUT_SECONDS = 15 * 60;

function computeLockoutSeconds(failedLoginCount: number): number {
  const exponent = failedLoginCount - FAILED_LOGIN_THRESHOLD;
  return Math.min(MAX_LOCKOUT_SECONDS, BASE_LOCKOUT_SECONDS * 2 ** exponent);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    strategy: "jwt",
    // Upper bound only (worst case: logging in right after midnight
    // Monday, so the real cutoff is nearly a full 7 days out) — the
    // actual per-login expiry is computed in the custom encode() below.
    maxAge: 8 * 24 * 60 * 60,
    // Deliberately far beyond maxAge so NextAuth never performs a
    // mid-session rolling refresh — that would re-encode with "the
    // next Monday from right now" on every active day, letting an
    // active user push their own cutoff past each Monday indefinitely.
    // The Monday cutoff has to be fixed at login and never renewed.
    updateAge: 30 * 24 * 60 * 60,
  },
  jwt: {
    encode: async (params) => defaultEncode({ ...params, maxAge: secondsUntilNextMonday(new Date()) }),
  },
  cookies: {
    sessionToken: {
      name: "ymg.session",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        // Parent-domain scope — this is what lets HRMS share this
        // session later (§3.6.3 / docs/ops/HOSTINGER_EXIT.md §1.1).
        domain: process.env.NODE_ENV === "production" ? ".ymg-legal.com" : undefined,
      },
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email.toLowerCase()))
          .limit(1);

        // Same failure for "no such account", "inactive", "pending
        // invite" (no password set yet), and "wrong password" — never
        // reveal which one it was (§3.6.2).
        if (!user || !user.isActive || !user.passwordHash) return null;

        // Locked out from previous failures — deny before even touching
        // bcrypt, and with the exact same generic failure as any other
        // case, so a lockout can't be distinguished from a wrong password.
        if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);

        if (!valid) {
          const failedLoginCount = user.failedLoginCount + 1;
          const lockedUntil =
            failedLoginCount >= FAILED_LOGIN_THRESHOLD
              ? new Date(Date.now() + computeLockoutSeconds(failedLoginCount) * 1000)
              : null;
          await db.update(users).set({ failedLoginCount, lockedUntil }).where(eq(users.id, user.id));
          return null;
        }

        if (user.failedLoginCount > 0 || user.lockedUntil) {
          await db.update(users).set({ failedLoginCount: 0, lockedUntil: null }).where(eq(users.id, user.id));
        }

        const grantedRoles = await db
          .select({ slug: roles.slug, isSystem: roles.isSystem })
          .from(userRoles)
          .innerJoin(roles, eq(userRoles.roleId, roles.id))
          .where(eq(userRoles.userId, user.id));

        return {
          id: String(user.id),
          name: user.name,
          email: user.email,
          // UI hints only — never used to make an authorization
          // decision. Every real permission check goes through
          // lib/permissions.ts against the database. The system role is
          // excluded even here — it's hidden from the UI everywhere,
          // including on the account that holds it (Pavan, 2026-09-01).
          roles: grantedRoles.filter((r) => !r.isSystem).map((r) => r.slug),
          // Stamped into the token at login. Compared against the live
          // DB value on every dashboard request (app/(dashboard)/layout.tsx)
          // — a mismatch means the password changed since this token was
          // issued, so the old session is forced to log in again.
          sessionVersion: user.sessionVersion,
        };
      },
    }),
  ],
  callbacks: {
    // NextAuth's jwt/session callback param types are inferred from an
    // overloaded union (JWT strategy vs. database strategy), which loses
    // the module-augmented fields from types/next-auth.d.ts. Casting at
    // the point of use is a type-only workaround — the runtime shape is
    // exactly what this file itself writes into token/session below.
    jwt: async ({ token, user }) => {
      if (user) {
        const u = user as { id: string; roles?: string[]; sessionVersion?: number };
        token.userId = u.id;
        token.roles = u.roles ?? [];
        token.sessionVersion = u.sessionVersion ?? 0;
      }
      return token;
    },
    session: async ({ session, token }) => {
      const t = token as { userId?: string; roles?: string[]; sessionVersion?: number };
      if (session.user && t.userId) {
        session.user.id = t.userId;
        session.user.roles = t.roles ?? [];
        session.user.sessionVersion = t.sessionVersion ?? 0;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
