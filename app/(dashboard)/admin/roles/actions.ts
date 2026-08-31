"use server";

import { redirect } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { roles, permissions, rolePermissions, userRoles } from "@/db/schema";
import { can } from "@/lib/permissions";

// §3.5: super admin composes roles from the developer-defined
// permission catalogue but can never invent a new permission key —
// only roles.manage lets you touch this table at all, and the
// permissions catalogue itself is never written to from here.
async function requireRolesManage(): Promise<number> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not signed in.");
  const userId = Number(session.user.id);
  if (!(await can(userId, "roles.manage"))) throw new Error("Not permitted.");
  return userId;
}

export async function createRoleAction(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  try {
    await requireRolesManage();
  } catch (err) {
    return err instanceof Error ? err.message : "Not permitted.";
  }

  const name = (formData.get("name") as string)?.trim();
  const slug = (formData.get("slug") as string)?.trim().toLowerCase().replace(/\s+/g, "_");
  if (!name || !slug) return "Name and slug are required.";

  const [existing] = await db.select().from(roles).where(eq(roles.slug, slug)).limit(1);
  if (existing) return "That slug is already in use.";

  const [role] = await db.insert(roles).values({ name, slug, isSystem: false }).returning();
  redirect(`/admin/roles/${role.id}`);
}

export async function updateRolePermissionsAction(roleId: number, formData: FormData): Promise<void> {
  await requireRolesManage();

  const [role] = await db.select().from(roles).where(eq(roles.id, roleId)).limit(1);
  // super_admin bypasses every check in code (lib/permissions.ts) —
  // giving it explicit grants here would be inert at best and
  // confusing at worst, so it's the one role this screen can't touch.
  if (!role || role.isSystem) return;

  const allPermissions = await db.select().from(permissions);

  await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));

  const newGrants = allPermissions
    .map((p) => ({ permissionId: p.id, scope: formData.get(`scope_${p.id}`) as string }))
    .filter((g) => g.scope === "own" || g.scope === "team" || g.scope === "all");

  if (newGrants.length > 0) {
    await db.insert(rolePermissions).values(
      newGrants.map((g) => ({ roleId, permissionId: g.permissionId, scope: g.scope as "own" | "team" | "all" }))
    );
  }
}

export async function deleteRoleAction(roleId: number): Promise<{ error?: string }> {
  await requireRolesManage();

  const [role] = await db.select().from(roles).where(eq(roles.id, roleId)).limit(1);
  if (!role) return { error: "Role not found." };
  if (role.isSystem) return { error: "Cannot delete a system role." };

  const [assignment] = await db.select().from(userRoles).where(eq(userRoles.roleId, roleId)).limit(1);
  if (assignment) return { error: "Reassign or remove everyone holding this role before deleting it." };

  await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));
  await db.delete(roles).where(and(eq(roles.id, roleId), eq(roles.isSystem, false)));
  return {};
}
