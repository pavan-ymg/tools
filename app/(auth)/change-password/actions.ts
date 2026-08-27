"use server";

import { eq, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { auth, signOut } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { validatePassword } from "@/lib/password-policy";

export async function changePasswordAction(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const session = await auth();
  if (!session?.user?.id) {
    return "Session expired. Please sign in again.";
  }

  const newPassword = formData.get("newPassword") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (newPassword !== confirmPassword) {
    return "Passwords do not match.";
  }

  const policyError = validatePassword(newPassword, session.user.email ?? "");
  if (policyError) return policyError;

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await db
    .update(users)
    .set({
      passwordHash,
      mustChangePassword: false,
      sessionVersion: sql`${users.sessionVersion} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, Number(session.user.id)));

  // Bumping sessionVersion makes the CURRENT token stale too (§3.6.2 —
  // a password change invalidates all sessions, not just future ones).
  // Sign out deliberately rather than trying to keep this session alive.
  await signOut({ redirectTo: "/login?passwordChanged=1" });
}
