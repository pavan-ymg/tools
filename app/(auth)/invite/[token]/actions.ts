"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { consumeAuthToken, markTokenUsed } from "@/lib/auth-tokens";
import { validatePassword } from "@/lib/password-policy";

export async function acceptInviteAction(
  token: string,
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const tokenRow = await consumeAuthToken(token, "invite");
  if (!tokenRow) return "This invite link is invalid or has expired.";

  const [user] = await db.select().from(users).where(eq(users.id, tokenRow.userId)).limit(1);
  if (!user) return "Account not found.";

  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;
  if (password !== confirmPassword) return "Passwords do not match.";

  const policyError = validatePassword(password, user.email);
  if (policyError) return policyError;

  const passwordHash = await bcrypt.hash(password, 12);
  // No mustChangePassword here — unlike the bootstrap flow, this
  // password was chosen by the account holder themselves, not
  // generated and handed to them (§3.6.1).
  await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, user.id));
  await markTokenUsed(tokenRow.id);

  redirect("/login?inviteAccepted=1");
}
