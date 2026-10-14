// Pure permission rules, no DB — split out of permissions.ts so they can
// be unit-tested (lib/__tests__/permission-logic.test.ts). permissions.ts
// does the loading and caching, this file decides.

export type Scope = "own" | "team" | "all";
export type OverrideScope = Scope | "none";

export const SCOPE_RANK: Record<Scope, number> = { own: 0, team: 1, all: 2 };
export const OVERRIDE_RANK: Record<OverrideScope, number> = { none: -1, own: 0, team: 1, all: 2 };

export type RoleGrantRow = {
  key: string | null;
  scope: Scope | null;
  is_system: boolean;
  slug: string;
};

/** Every role's grants merged — broadest scope wins per permission. */
export function mergeRoleGrants(rows: RoleGrantRow[]): { isSuperAdmin: boolean; grants: Map<string, Scope> } {
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
 * Per-user overrides layered on role grants; an override always wins,
 * including "none" (explicit revoke). Returns a NEW map — the input is
 * the request-cached loadRoleGrants() result, which the override editor
 * also reads as "role default", so it must never be mutated.
 */
export function applyOverrides(grants: Map<string, Scope>, overrides: Map<string, OverrideScope>): Map<string, Scope> {
  const merged = new Map(grants);
  for (const [key, scope] of overrides) {
    if (scope === "none") {
      merged.delete(key);
    } else {
      merged.set(key, scope);
    }
  }
  return merged;
}

/**
 * Whether `scope` covers a record. "team" needs the viewer's subtree,
 * which is only fetched when actually required — so it's passed lazily.
 */
export async function scopeCovers(
  scope: Scope | undefined,
  userId: number,
  recordOwnerId: number | undefined,
  getSubordinateIds: () => Promise<number[]>
): Promise<boolean> {
  if (!scope) return false;
  if (scope === "all") return true;
  if (recordOwnerId === undefined) return true; // non-record permission, grant existed

  if (scope === "own") return recordOwnerId === userId;

  // team: the record owner is this user, or anywhere in their subtree
  if (recordOwnerId === userId) return true;
  return (await getSubordinateIds()).includes(recordOwnerId);
}
