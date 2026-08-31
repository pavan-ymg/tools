"use server";

import { headers } from "next/headers";
import { eq, sql, and, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, roles, userRoles } from "@/db/schema";
import { can } from "@/lib/permissions";
import { createAuthToken } from "@/lib/auth-tokens";
import { sendInviteEmail } from "@/lib/email";
import { logAudit } from "@/lib/audit";

const INVITE_TTL_MS = 72 * 60 * 60 * 1000; // §3.6.3 — 72h, survives a Friday invite over the weekend

async function requireUsersManage(): Promise<number> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not signed in.");
  const userId = Number(session.user.id);
  if (!(await can(userId, "users.manage"))) throw new Error("Not permitted.");
  return userId;
}

// Server-side half of the same rule as listAssignableRoles() below — the
// UI hides system roles from the checkboxes, but that alone doesn't stop
// a crafted request from submitting roleId=<super_admin> directly. Both
// invite and update filter every submitted roleId through this before
// it ever reaches userRoles.
async function assignableRoleIds(): Promise<Set<number>> {
  const rows = await db.select({ id: roles.id }).from(roles).where(eq(roles.isSystem, false));
  return new Set(rows.map((r) => r.id));
}

// Whether this user holds the system role — checked independently of
// assignableRoleIds() because that only guards which roles can be
// GRANTED. This guards the user row itself: a super_admin must never be
// deactivated or deleted by anyone else with users.manage, or the one
// account meant to be unconditionally recoverable stops being that.
export async function isSuperAdmin(targetUserId: number): Promise<boolean> {
  const [row] = await db
    .select({ id: roles.id })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(and(eq(userRoles.userId, targetUserId), eq(roles.isSystem, true)))
    .limit(1);
  return !!row;
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
  let actorId: number;
  try {
    actorId = await requireUsersManage();
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Not permitted." };
  }

  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const managerIdRaw = formData.get("managerId") as string;
  const managerId = managerIdRaw ? Number(managerIdRaw) : null;
  const submittedRoleIds = formData.getAll("roleIds").map(Number);
  const allowed = await assignableRoleIds();
  const roleIds = submittedRoleIds.filter((roleId) => allowed.has(roleId));

  if (!name || !email) return { error: "Name and email are required." };
  if (roleIds.length === 0) return { error: "Select at least one role." };

  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing) return { error: "That email is already in use." };

  const [user] = await db
    .insert(users)
    .values({ name, email, managerId, passwordHash: null, isActive: true })
    .returning();

  await db.insert(userRoles).values(roleIds.map((roleId) => ({ userId: user.id, roleId })));

  const grantedRoles = await db.select({ name: roles.name }).from(roles).where(inArray(roles.id, roleIds));
  await logAudit(actorId, "user_invited", "user", user.id, `${name} (${email})`, {
    roles: grantedRoles.map((r) => r.name),
    managerId,
  });

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
  const actorId = await requireUsersManage();

  const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!target) return;

  const managerIdRaw = formData.get("managerId") as string;
  const managerId = managerIdRaw ? Number(managerIdRaw) : null;
  const weeklyTargetRaw = formData.get("weeklyTarget") as string;
  const weeklyTarget = weeklyTargetRaw ? Number(weeklyTargetRaw) : null;
  const submittedRoleIds = formData.getAll("roleIds").map(Number);
  const allowed = await assignableRoleIds();
  const roleIds = submittedRoleIds.filter((roleId) => allowed.has(roleId));

  // A super_admin's own account can never be deactivated through this
  // form, by anyone — the "Active" checkbox is simply ignored for them.
  const targetIsSuperAdmin = await isSuperAdmin(id);
  const isActive = targetIsSuperAdmin ? true : formData.get("isActive") === "on";

  await db.update(users).set({ managerId, isActive, weeklyTarget, updatedAt: new Date() }).where(eq(users.id, id));

  // Only replace non-system role rows — a system role (super_admin)
  // isn't shown as a checkbox here at all (listAssignableRoles), so a
  // blind delete-everything-then-reinsert would silently strip it from
  // whoever holds it the next time their profile is saved through this
  // form. Scoping the delete to `allowed` leaves any such row untouched.
  await db.delete(userRoles).where(and(eq(userRoles.userId, id), inArray(userRoles.roleId, [...allowed])));
  if (roleIds.length > 0) {
    await db.insert(userRoles).values(roleIds.map((roleId) => ({ userId: id, roleId })));
  }

  const grantedRoles = await db.select({ name: roles.name }).from(roles).where(inArray(roles.id, roleIds));
  await logAudit(actorId, "user_updated", "user", id, `${target.name} (${target.email})`, {
    managerId,
    isActive,
    roles: grantedRoles.map((r) => r.name),
  });
}

/**
 * Force-reset: bumps sessionVersion (kills every existing session
 * immediately, same mechanism as a self-service password change) and
 * issues a fresh reset link — for offboarding or a compromised account.
 */
export async function forceResetAction(id: number): Promise<{ resetUrl: string }> {
  const actorId = await requireUsersManage();

  const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1);

  await db
    .update(users)
    .set({ sessionVersion: sql`${users.sessionVersion} + 1`, updatedAt: new Date() })
    .where(eq(users.id, id));

  if (target) {
    await logAudit(actorId, "user_force_reset", "user", id, `${target.name} (${target.email})`);
  }

  const token = await createAuthToken(id, "reset", 60 * 60 * 1000);
  return { resetUrl: `${await baseUrl()}/reset-password/${token}` };
}

// Excludes system roles (super_admin) — that role is never assignable
// through either the invite or edit form. It's seeded once at bootstrap
// and reserved deliberately (§3.5): if it were pickable here, anyone
// with users.manage could hand it to themselves or anyone else, which
// defeats the whole point of keeping it a rare, hardcoded bypass.
export async function listAssignableRoles() {
  return db.select().from(roles).where(eq(roles.isSystem, false)).orderBy(roles.name);
}

export async function listManagerCandidates(excludeUserId?: number) {
  const rows = await db.select({ id: users.id, name: users.name }).from(users).where(eq(users.isActive, true));
  return excludeUserId ? rows.filter((r) => r.id !== excludeUserId) : rows;
}

export async function getUserRoleIds(userId: number): Promise<number[]> {
  const rows = await db.select({ roleId: userRoles.roleId }).from(userRoles).where(eq(userRoles.userId, userId));
  return rows.map((r) => r.roleId);
}

export async function toggleUserActiveAction(id: number, nextActive: boolean): Promise<{ error?: string }> {
  const actorId = await requireUsersManage();

  if (!nextActive && (await isSuperAdmin(id))) {
    return { error: "Can't deactivate a super_admin account." };
  }

  const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!target) return { error: "User not found." };

  await db.update(users).set({ isActive: nextActive, updatedAt: new Date() }).where(eq(users.id, id));
  await logAudit(actorId, nextActive ? "user_reactivated" : "user_deactivated", "user", id, `${target.name} (${target.email})`);
  return {};
}

/**
 * Hard delete — deliberately separate from deactivate, which stays the
 * default offboarding path since it preserves intake records/audit
 * history that reference the user. This only succeeds when nothing
 * references them: intake_records.ownerId and .tlReviewedBy have no
 * onDelete rule (Postgres default NO ACTION), so the delete itself
 * fails with a foreign-key violation if they've ever owned or reviewed
 * a record — caught here and turned into a clear message rather than
 * a raw DB error.
 */
export async function deleteUserAction(id: number): Promise<{ error?: string }> {
  const currentUserId = await requireUsersManage();
  if (id === currentUserId) return { error: "You can't delete your own account." };

  const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!target) return { error: "User not found." };
  if (await isSuperAdmin(id)) return { error: "Can't delete a super_admin account." };

  try {
    await db.delete(users).where(eq(users.id, id));
    await logAudit(currentUserId, "user_deleted", "user", id, `${target.name} (${target.email})`);
    return {};
  } catch {
    return {
      error: "Can't delete — this user owns or has reviewed intake records. Deactivate instead, or reassign those records first.",
    };
  }
}
