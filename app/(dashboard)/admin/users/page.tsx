import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, roles, userRoles } from "@/db/schema";
import { can } from "@/lib/permissions";
import UserRowActions from "./UserRowActions";

export default async function UsersListPage() {
  const session = await auth();
  const userId = Number(session!.user.id);

  if (!(await can(userId, "users.manage"))) {
    return (
      <main style={{ padding: 32 }}>
        <p style={{ color: "var(--text-secondary)" }}>You don&apos;t have permission to manage users.</p>
      </main>
    );
  }

  const allUsers = await db.select().from(users).orderBy(users.name);
  const allRoles = await db.select().from(roles).orderBy(roles.name);
  const allUserRoles = await db.select().from(userRoles);

  const managerNameById = new Map(allUsers.map((u) => [u.id, u.name]));
  const roleNameById = new Map(allRoles.map((r) => [r.id, r.name]));
  const systemRoleIds = new Set(allRoles.filter((r) => r.isSystem).map((r) => r.id));
  const rolesByUserId = new Map<number, string[]>();
  const superAdminUserIds = new Set<number>();
  for (const ur of allUserRoles) {
    const list = rolesByUserId.get(ur.userId) ?? [];
    const name = roleNameById.get(ur.roleId);
    if (name) list.push(name);
    rolesByUserId.set(ur.userId, list);
    if (systemRoleIds.has(ur.roleId)) superAdminUserIds.add(ur.userId);
  }

  return (
    <main style={{ padding: 32 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>Users</h1>
        <Link
          href="/admin/users/invite"
          style={{ background: "var(--accent)", color: "var(--accent-text)", padding: "8px 16px", borderRadius: 6, fontSize: 13, textDecoration: "none" }}
        >
          + Invite user
        </Link>
      </div>

      <div style={{ overflowX: "auto", border: "1px solid var(--glass-border)", borderRadius: 8 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "rgba(255,255,255,0.03)" }}>
              {["Name", "Email", "Status", "Manager", "Roles", ""].map((h) => (
                <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 13, color: "var(--text-secondary)", borderBottom: "1px solid var(--glass-border)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allUsers.map((u) => {
              const pending = !u.passwordHash;
              return (
                <tr key={u.id}>
                  <td style={{ padding: "10px 14px", fontSize: 13, borderBottom: "1px solid var(--glass-border)" }}>{u.name}</td>
                  <td style={{ padding: "10px 14px", fontSize: 13, borderBottom: "1px solid var(--glass-border)" }}>{u.email}</td>
                  <td style={{ padding: "10px 14px", fontSize: 13, borderBottom: "1px solid var(--glass-border)" }}>
                    {!u.isActive ? "Deactivated" : pending ? "Pending" : "Active"}
                  </td>
                  <td style={{ padding: "10px 14px", fontSize: 13, borderBottom: "1px solid var(--glass-border)" }}>
                    {u.managerId ? managerNameById.get(u.managerId) ?? "—" : "—"}
                  </td>
                  <td style={{ padding: "10px 14px", fontSize: 13, borderBottom: "1px solid var(--glass-border)" }}>
                    {(rolesByUserId.get(u.id) ?? []).join(", ") || "—"}
                  </td>
                  <td style={{ padding: "10px 14px", fontSize: 13, borderBottom: "1px solid var(--glass-border)" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                      <Link href={`/admin/users/${u.id}`} style={{ color: "var(--accent)" }}>
                        Edit
                      </Link>
                      {!superAdminUserIds.has(u.id) && <UserRowActions userId={u.id} name={u.name} isActive={u.isActive} />}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
