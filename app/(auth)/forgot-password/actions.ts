"use server";

import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { createAuthToken } from "@/lib/auth-tokens";
import { sendPasswordResetEmail } from "@/lib/email";

const RESET_TTL_MS = 60 * 60 * 1000; // §3.6.2 — 60 minutes

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
  if (user && user.isActive && user.passwordHash) {
    const token = await createAuthToken(user.id, "reset", RESET_TTL_MS);
    const h = await headers();
    const host = h.get("host");
    const protocol = host?.startsWith("localhost") ? "http" : "https";
    try {
      await sendPasswordResetEmail(email, `${protocol}://${host}/reset-password/${token}`);
    } catch {
      // Swallow — the generic message is shown either way, so a
      // delivery failure here doesn't leak anything either.
    }
  }

  return genericMessage;
}
