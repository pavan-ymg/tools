import Link from "next/link";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { roles, rolePermissions, userRoles } from "@/db/schema";
import { can } from "@/lib/permissions";
import DeleteRoleButton from "./DeleteRoleButton";

export default async function RolesListPage() {
  const session = await auth();
  const userId = Number(session!.user.id);

  if (!(await can(userId, "roles.manage"))) {
    return (
      <main style={{ padding: 32 }}>
        <p style={{ color: "var(--text-secondary)" }}>You don&apos;t have permission to manage roles.</p>
      </main>
    );
  }

  // System roles (super_admin) never show here — it's not editable
  // through this screen anyway (bypasses every check in code, seeded
  // once at bootstrap), so listing it just invites confusion about
  // whether it's configurable. §5.14.
  const allRoles = await db.select().from(roles).where(eq(roles.isSystem, false)).orderBy(roles.name);
  const allGrants = await db.select().from(rolePermissions);
  const allAssignments = await db.select().from(userRoles);

  const grantCountByRole = new Map<number, number>();
  for (const g of allGrants) grantCountByRole.set(g.roleId, (grantCountByRole.get(g.roleId) ?? 0) + 1);
  const userCountByRole = new Map<number, number>();
  for (const a of allAssignments) userCountByRole.set(a.roleId, (userCountByRole.get(a.roleId) ?? 0) + 1);

  return (
    <main style={{ padding: 32 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>Roles</h1>
        <Link
          href="/admin/roles/new"
          style={{ background: "var(--accent)", color: "white", padding: "8px 16px", borderRadius: 6, fontSize: 13, textDecoration: "none" }}
        >
          + New role
        </Link>
      </div>

      <div style={{ overflowX: "auto", border: "1px solid var(--glass-border)", borderRadius: 8 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "rgba(255,255,255,0.03)" }}>
              {["Name", "Users", "Permissions granted", ""].map((h) => (
                <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 13, color: "var(--text-secondary)", borderBottom: "1px solid var(--glass-border)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allRoles.map((r) => (
              <tr key={r.id}>
                <td style={{ padding: "10px 14px", fontSize: 13, borderBottom: "1px solid var(--glass-border)" }}>{r.name}</td>
                <td style={{ padding: "10px 14px", fontSize: 13, borderBottom: "1px solid var(--glass-border)" }}>{userCountByRole.get(r.id) ?? 0}</td>
                <td style={{ padding: "10px 14px", fontSize: 13, borderBottom: "1px solid var(--glass-border)" }}>{grantCountByRole.get(r.id) ?? 0}</td>
                <td style={{ padding: "10px 14px", fontSize: 13, borderBottom: "1px solid var(--glass-border)", display: "flex", gap: 12 }}>
                  <Link href={`/admin/roles/${r.id}`} style={{ color: "var(--accent)" }}>
                    Edit
                  </Link>
                  <DeleteRoleButton roleId={r.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
