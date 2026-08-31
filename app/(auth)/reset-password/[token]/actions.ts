"use server";

import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { consumeAuthToken, markTokenUsed } from "@/lib/auth-tokens";
import { validatePassword } from "@/lib/password-policy";

export async function resetPasswordAction(
  token: string,
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const tokenRow = await consumeAuthToken(token, "reset");
  if (!tokenRow) return "This reset link is invalid or has expired.";

  const [user] = await db.select().from(users).where(eq(users.id, tokenRow.userId)).limit(1);
  if (!user) return "Account not found.";

  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;
  if (password !== confirmPassword) return "Passwords do not match.";

  const policyError = validatePassword(password, user.email);
  if (policyError) return policyError;

  const passwordHash = await bcrypt.hash(password, 12);
  await db
    .update(users)
    .set({
      passwordHash,
      // Invalidates every existing session, including whatever session
      // led to this reset request — a stolen session must not survive
      // the reset meant to kill it (§3.6.2).
      sessionVersion: sql`${users.sessionVersion} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));
  await markTokenUsed(tokenRow.id);

  redirect("/login?passwordChanged=1");
}
