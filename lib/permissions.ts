import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

export type Scope = "own" | "team" | "all";
export type OverrideScope = Scope | "none";

export const SCOPE_RANK: Record<Scope, number> = { own: 0, team: 1, all: 2 };
export const OVERRIDE_RANK: Record<OverrideScope, number> = { none: -1, own: 0, team: 1, all: 2 };

/**
 * Role-derived grants only — every permission across every role a user
 * holds, plus whether any of those roles is the hardcoded super_admin
 * escape hatch. Exported so the per-user override editor (§ user
 * permission overrides) can show "role default" alongside the override
 * for each capability.
 */
export async function loadRoleGrants(userId: number): Promise<{ isSuperAdmin: boolean; grants: Map<string, Scope> }> {
  const result = await db.execute(sql`
    SELECT p.key AS key, rp.scope AS scope, r.is_system AS is_system, r.slug AS slug
    FROM user_roles ur
    INNER JOIN roles r ON r.id = ur.role_id
    LEFT JOIN role_permissions rp ON rp.role_id = r.id
    LEFT JOIN permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = ${userId}
  `);

  const rows = result.rows as Array<{
    key: string | null;
    scope: Scope | null;
    is_system: boolean;
    slug: string;
  }>;

  const isSuperAdmin = rows.some((r) => r.is_system && r.slug === "super_admin");

  const grants = new Map<string, Scope>();
  for (const row of rows) {
    if (!row.key || !row.scope) continue;
    const existing = grants.get(row.key);
    if (!existing || SCOPE_RANK[row.scope] > SCOPE_RANK[existing]) {
      grants.set(row.key, row.scope);
    }
  }

  return { isSuperAdmin, grants };
}

/**
 * This user's individual permission overrides, keyed by permission key —
 * a row here always wins over whatever loadRoleGrants() computed,
 * including "none" (an explicit revoke). Exported for the same reason
 * as loadRoleGrants().
 */
export async function loadOverrides(userId: number): Promise<Map<string, OverrideScope>> {
  const result = await db.execute(sql`
    SELECT p.key AS key, upo.scope AS scope
    FROM user_permission_overrides upo
    INNER JOIN permissions p ON p.id = upo.permission_id
    WHERE upo.user_id = ${userId}
  `);
  const rows = result.rows as Array<{ key: string; scope: OverrideScope }>;
  return new Map(rows.map((r) => [r.key, r.scope]));
}

/**
 * Role grants with per-user overrides layered on top — the one thing
 * can()/getScope() actually check. Never exported directly; the two
 * pieces above are exported separately for the override editor, which
 * needs to see role-default and override as distinct values, not
 * already merged.
 */
async function loadGrants(userId: number): Promise<{ isSuperAdmin: boolean; grants: Map<string, Scope> }> {
  const { isSuperAdmin, grants } = await loadRoleGrants(userId);
  if (isSuperAdmin) return { isSuperAdmin, grants };

  const overrides = await loadOverrides(userId);
  for (const [key, scope] of overrides) {
    if (scope === "none") {
      grants.delete(key);
    } else {
      grants.set(key, scope);
    }
  }

  return { isSuperAdmin, grants };
}

/**
 * Every user beneath `userId` in the reporting tree, at any depth —
 * the "team" scope resolves against this set. Self-referencing
 * manager_id means this is the only place hierarchy depth matters;
 * inserting a Director later needs no change here (§3.5).
 */
export async function subordinateIds(userId: number): Promise<number[]> {
  const result = await db.execute(sql`
    WITH RECURSIVE subtree AS (
      SELECT id FROM users WHERE manager_id = ${userId}
      UNION ALL
      SELECT u.id FROM users u INNER JOIN subtree s ON u.manager_id = s.id
    )
    SELECT id FROM subtree
  `);
  return (result.rows as Array<{ id: number }>).map((r) => r.id);
}

/**
 * The one permission check used everywhere (§3.5).
 *
 *   can(userId, 'intake.edit', record.ownerId)
 *
 * Pass no `recordOwnerId` for permissions that aren't record-scoped
 * (e.g. 'roles.manage').
 */
export async function can(
  userId: number,
  permissionKey: string,
  recordOwnerId?: number
): Promise<boolean> {
  const { isSuperAdmin, grants } = await loadGrants(userId);
  if (isSuperAdmin) return true;

  const scope = grants.get(permissionKey);
  if (!scope) return false;
  if (scope === "all") return true;
  if (recordOwnerId === undefined) return true; // non-record permission, grant existed

  if (scope === "own") return recordOwnerId === userId;

  // team: the record owner is this user, or anywhere in their subtree
  if (recordOwnerId === userId) return true;
  const ids = await subordinateIds(userId);
  return ids.includes(recordOwnerId);
}

/**
 * The broadest scope a user holds for a permission, or null if they
 * don't hold it at all. For building a LIST query's WHERE clause (e.g.
 * "which intake records can this user see") — `can()` answers "is this
 * ONE record visible", this answers "what's the boundary for a list".
 * Super admin gets 'all' without needing an explicit grant row.
 */
export async function getScope(userId: number, permissionKey: string): Promise<Scope | null> {
  const { isSuperAdmin, grants } = await loadGrants(userId);
  if (isSuperAdmin) return "all";
  return grants.get(permissionKey) ?? null;
}
