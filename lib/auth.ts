import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, userRoles, roles } from "@/db/schema";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours — matches HRMS today (§3.6.3)
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

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        const grantedRoles = await db
          .select({ slug: roles.slug })
          .from(userRoles)
          .innerJoin(roles, eq(userRoles.roleId, roles.id))
          .where(eq(userRoles.userId, user.id));

        return {
          id: String(user.id),
          name: user.name,
          email: user.email,
          // UI hints only — never used to make an authorization
          // decision. Every real permission check goes through
          // lib/permissions.ts against the database.
          roles: grantedRoles.map((r) => r.slug),
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
