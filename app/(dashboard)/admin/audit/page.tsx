import Link from "next/link";
import { desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { auditLog } from "@/db/schema";
import { can } from "@/lib/permissions";

const ACTION_LABELS: Record<string, string> = {
  user_invited: "Invited user",
  user_updated: "Updated user",
  user_deactivated: "Deactivated user",
  user_reactivated: "Reactivated user",
  user_deleted: "Deleted user",
  user_force_reset: "Force-reset user's password",
  role_created: "Created role",
  role_permissions_updated: "Updated role permissions",
  role_deleted: "Deleted role",
  user_permissions_overridden: "Edited user's individual permissions",
};

export default async function AuditLogPage() {
  const session = await auth();
  const userId = Number(session!.user.id);

  // Gated on roles.manage rather than a new permission key — this shows
  // every admin action across users and roles, which is the same trust
  // level as being able to restructure permissions themselves (§5.16:
  // built after a Manager deleted the super_admin account with zero
  // record of it happening).
  if (!(await can(userId, "roles.manage"))) {
    return (
      <main style={{ padding: 32 }}>
        <p style={{ color: "var(--text-secondary)" }}>You don&apos;t have permission to view the audit log.</p>
      </main>
    );
  }

  const entries = await db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(200);

  return (
    <main style={{ padding: 32 }}>
      <div style={{ marginBottom: 4 }}>
        <Link href="/admin/users" style={{ fontSize: 13, color: "var(--accent)" }}>
          ← Back to Users
        </Link>
      </div>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Audit Log</h1>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 24 }}>
        Every user and role management action, most recent first. Survives the deletion of either account involved.
      </p>

      <div style={{ overflowX: "auto", border: "1px solid var(--glass-border)", borderRadius: 8 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "rgba(255,255,255,0.03)" }}>
              {["When", "Who", "Action", "Target", "Detail"].map((h) => (
                <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 13, color: "var(--text-secondary)", borderBottom: "1px solid var(--glass-border)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id}>
                <td style={{ padding: "10px 14px", fontSize: 13, borderBottom: "1px solid var(--glass-border)", whiteSpace: "nowrap" }}>
                  {e.createdAt.toLocaleString()}
                </td>
                <td style={{ padding: "10px 14px", fontSize: 13, borderBottom: "1px solid var(--glass-border)" }}>{e.actorLabel}</td>
                <td style={{ padding: "10px 14px", fontSize: 13, borderBottom: "1px solid var(--glass-border)" }}>
                  {ACTION_LABELS[e.action] ?? e.action}
                </td>
                <td style={{ padding: "10px 14px", fontSize: 13, borderBottom: "1px solid var(--glass-border)" }}>{e.targetLabel}</td>
                <td style={{ padding: "10px 14px", fontSize: 12, color: "var(--text-secondary)", borderBottom: "1px solid var(--glass-border)", maxWidth: 320 }}>
                  {e.detail ? JSON.stringify(e.detail) : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {entries.length === 0 && (
          <p style={{ padding: 24, color: "var(--text-secondary)", fontSize: 13 }}>No admin actions logged yet.</p>
        )}
      </div>
    </main>
  );
}
