"use server";

import { and, count, eq, gt } from "drizzle-orm";
import { db } from "@/lib/db";
import { authTokens, users } from "@/db/schema";
import { createAuthToken } from "@/lib/auth-tokens";
import { sendPasswordResetEmail } from "@/lib/email";
import { appBaseUrl } from "@/lib/app-url";

const RESET_TTL_MS = 60 * 60 * 1000; // §3.6.2 — 60 minutes

// Per-account cap on reset emails. Without it anyone could fire unlimited
// reset emails at a colleague's inbox (and burn Resend quota). Per-account,
// not per-IP — the whole office shares one IP behind the allowlist.
const MAX_RESETS_PER_WINDOW = 3;
const RESET_RATE_WINDOW_MS = 60 * 60 * 1000;

async function recentResetCount(userId: number): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(authTokens)
    .where(
      and(
        eq(authTokens.userId, userId),
        eq(authTokens.type, "reset"),
        gt(authTokens.createdAt, new Date(Date.now() - RESET_RATE_WINDOW_MS))
      )
    );
  return row?.n ?? 0;
}

export async function requestPasswordResetAction(
  _prevState: string | undefined,
  formData: FormData
): Promise<string> {
  // Always the same message regardless of what's found below — never
  // reveal whether an email exists, or the form becomes an account-
  // enumeration tool (§3.6.2).
  const genericMessage = "If that email exists, we've sent a reset link.";

  const email = (formData.get("email") as string)?.trim().toLowerCase();
  if (!email) return genericMessage;

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  // A pending invite (no passwordHash yet) has nothing to "reset" —
  // send them through the invite link instead, silently.
  // Over the limit → silently skip; same generic message, so the cap
  // doesn't become an account-enumeration signal either.
  if (user && user.isActive && user.passwordHash && (await recentResetCount(user.id)) < MAX_RESETS_PER_WINDOW) {
    const token = await createAuthToken(user.id, "reset", RESET_TTL_MS);
    try {
      await sendPasswordResetEmail(email, `${appBaseUrl()}/reset-password/${token}`);
    } catch {
      // Swallow — the generic message is shown either way, so a
      // delivery failure here doesn't leak anything either.
    }
  }

  return genericMessage;
}
