import { describe, expect, it, vi } from "vitest";
import { applyOverrides, mergeRoleGrants, scopeCovers, type RoleGrantRow } from "@/lib/permission-logic";

const row = (key: string | null, scope: RoleGrantRow["scope"], slug = "agent", is_system = false): RoleGrantRow => ({
  key,
  scope,
  slug,
  is_system,
});

describe("mergeRoleGrants", () => {
  it("keeps the broadest scope across roles", () => {
    const { grants } = mergeRoleGrants([
      row("intake.view", "own"),
      row("intake.view", "team", "team_lead"),
      row("intake.view", "own", "manager"),
    ]);
    expect(grants.get("intake.view")).toBe("team");
  });

  it("flags super_admin only for the system role with that slug", () => {
    expect(mergeRoleGrants([row(null, null, "super_admin", true)]).isSuperAdmin).toBe(true);
    // A custom role someone named super_admin is not the escape hatch.
    expect(mergeRoleGrants([row(null, null, "super_admin", false)]).isSuperAdmin).toBe(false);
    expect(mergeRoleGrants([row(null, null, "admin", true)]).isSuperAdmin).toBe(false);
  });

  it("skips rows from roles with no permissions", () => {
    expect(mergeRoleGrants([row(null, null)]).grants.size).toBe(0);
  });
});

describe("applyOverrides", () => {
  it("override wins, including narrowing and explicit revoke", () => {
    const roleGrants = new Map([
      ["intake.view", "all" as const],
      ["leads.view", "all" as const],
    ]);
    const merged = applyOverrides(
      roleGrants,
      new Map([
        ["intake.view", "own" as const],
        ["leads.view", "none" as const],
        ["users.manage", "team" as const],
      ])
    );
    expect(merged.get("intake.view")).toBe("own");
    expect(merged.has("leads.view")).toBe(false);
    expect(merged.get("users.manage")).toBe("team");
  });

  it("never mutates the role-grants map (it's the request-cached role default)", () => {
    const roleGrants = new Map([["leads.view", "all" as const]]);
    applyOverrides(roleGrants, new Map([["leads.view", "none" as const]]));
    expect(roleGrants.get("leads.view")).toBe("all");
  });
});

describe("scopeCovers", () => {
  const noSubtree = () => Promise.resolve([]);

  it("denies when the permission isn't held", async () => {
    expect(await scopeCovers(undefined, 1, 1, noSubtree)).toBe(false);
  });

  it("own: only the user's own records", async () => {
    expect(await scopeCovers("own", 1, 1, noSubtree)).toBe(true);
    expect(await scopeCovers("own", 1, 2, noSubtree)).toBe(false);
  });

  it("team: own records and anyone in the subtree, nobody else", async () => {
    const subtree = vi.fn(() => Promise.resolve([5, 6]));
    expect(await scopeCovers("team", 1, 1, subtree)).toBe(true);
    expect(subtree).not.toHaveBeenCalled(); // no DB hit for own record
    expect(await scopeCovers("team", 1, 6, subtree)).toBe(true);
    expect(await scopeCovers("team", 1, 9, subtree)).toBe(false);
  });

  it("all: every record", async () => {
    expect(await scopeCovers("all", 1, 99, noSubtree)).toBe(true);
  });

  it("non-record permissions only need the grant", async () => {
    expect(await scopeCovers("own", 1, undefined, noSubtree)).toBe(true);
  });
});
