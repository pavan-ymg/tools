"use server";

import { headers } from "next/headers";
import { eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, roles, userRoles } from "@/db/schema";
import { can } from "@/lib/permissions";
import { createAuthToken } from "@/lib/auth-tokens";
import { sendInviteEmail } from "@/lib/email";

const INVITE_TTL_MS = 72 * 60 * 60 * 1000; // §3.6.3 — 72h, survives a Friday invite over the weekend

async function requireUsersManage(): Promise<number> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not signed in.");
  const userId = Number(session.user.id);
  if (!(await can(userId, "users.manage"))) throw new Error("Not permitted.");
  return userId;
}

async function baseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("host");
  const protocol = host?.startsWith("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

export type InviteResult = { error?: string; inviteUrl?: string; emailSent?: boolean };

export async function inviteUserAction(
  _prevState: InviteResult | undefined,
  formData: FormData
): Promise<InviteResult> {
  try {
    await requireUsersManage();
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Not permitted." };
  }

  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const managerIdRaw = formData.get("managerId") as string;
  const managerId = managerIdRaw ? Number(managerIdRaw) : null;
  const roleIds = formData.getAll("roleIds").map(Number);

  if (!name || !email) return { error: "Name and email are required." };
  if (roleIds.length === 0) return { error: "Select at least one role." };

  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing) return { error: "That email is already in use." };

  const [user] = await db
    .insert(users)
    .values({ name, email, managerId, passwordHash: null, isActive: true })
    .returning();

  await db.insert(userRoles).values(roleIds.map((roleId) => ({ userId: user.id, roleId })));

  const token = await createAuthToken(user.id, "invite", INVITE_TTL_MS);
  const inviteUrl = `${await baseUrl()}/invite/${token}`;

  // The invite URL is always returned to the admin regardless — email
  // delivery is best-effort, not the only path (e.g. before the send
  // domain is verified in Resend). See lib/email.ts.
  let emailSent = false;
  try {
    await sendInviteEmail(email, name, inviteUrl);
    emailSent = true;
  } catch {
    emailSent = false;
  }

  return { inviteUrl, emailSent };
}

export async function updateUserAction(id: number, formData: FormData): Promise<void> {
  await requireUsersManage();

  const managerIdRaw = formData.get("managerId") as string;
  const managerId = managerIdRaw ? Number(managerIdRaw) : null;
  const isActive = formData.get("isActive") === "on";
  const roleIds = formData.getAll("roleIds").map(Number);

  await db.update(users).set({ managerId, isActive, updatedAt: new Date() }).where(eq(users.id, id));

  await db.delete(userRoles).where(eq(userRoles.userId, id));
  if (roleIds.length > 0) {
    await db.insert(userRoles).values(roleIds.map((roleId) => ({ userId: id, roleId })));
  }
}

/**
 * Force-reset: bumps sessionVersion (kills every existing session
 * immediately, same mechanism as a self-service password change) and
 * issues a fresh reset link — for offboarding or a compromised account.
 */
export async function forceResetAction(id: number): Promise<{ resetUrl: string }> {
  await requireUsersManage();

  await db
    .update(users)
    .set({ sessionVersion: sql`${users.sessionVersion} + 1`, updatedAt: new Date() })
    .where(eq(users.id, id));

  const token = await createAuthToken(id, "reset", 60 * 60 * 1000);
  return { resetUrl: `${await baseUrl()}/reset-password/${token}` };
}

export async function listAssignableRoles() {
  return db.select().from(roles).orderBy(roles.name);
}

export async function listManagerCandidates(excludeUserId?: number) {
  const rows = await db.select({ id: users.id, name: users.name }).from(users).where(eq(users.isActive, true));
  return excludeUserId ? rows.filter((r) => r.id !== excludeUserId) : rows;
}

export async function getUserRoleIds(userId: number): Promise<number[]> {
  const rows = await db.select({ roleId: userRoles.roleId }).from(userRoles).where(eq(userRoles.userId, userId));
  return rows.map((r) => r.roleId);
}
