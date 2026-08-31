import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { can } from "@/lib/permissions";
import { updateUserAction, listManagerCandidates, listAssignableRoles, getUserRoleIds, isSuperAdmin } from "../actions";
import ForceResetButton from "./ForceResetButton";

const inputStyle: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 6,
  border: "1px solid var(--glass-border)",
  background: "rgba(0,0,0,0.2)",
  color: "var(--text-primary)",
  width: "100%",
  boxSizing: "border-box",
};

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idParam } = await params;
  const id = Number(idParam);
  if (Number.isNaN(id)) notFound();

  const session = await auth();
  const currentUserId = Number(session!.user.id);

  if (!(await can(currentUserId, "users.manage"))) {
    return (
      <main style={{ padding: 32 }}>
        <p style={{ color: "var(--text-secondary)" }}>You don&apos;t have permission to manage users.</p>
      </main>
    );
  }

  const [targetUser] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!targetUser) notFound();

  const [allRoles, managers, currentRoleIds, targetIsSuperAdmin] = await Promise.all([
    listAssignableRoles(),
    listManagerCandidates(id),
    getUserRoleIds(id),
    isSuperAdmin(id),
  ]);

  const boundUpdate = updateUserAction.bind(null, id);

  return (
    <main style={{ padding: 32, maxWidth: 420 }}>
      <div style={{ marginBottom: 4 }}>
        <Link href="/admin/users" style={{ fontSize: 13, color: "var(--accent)" }}>
          ← Back to Users
        </Link>
      </div>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>{targetUser.name}</h1>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 24 }}>{targetUser.email}</p>

      <form action={boundUpdate} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Reports to</span>
          <select name="managerId" style={inputStyle} defaultValue={targetUser.managerId ?? ""}>
            <option value="">(no manager)</option>
            {managers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={targetUser.isActive}
            disabled={targetIsSuperAdmin}
            style={{ width: 16, height: 16 }}
          />
          Active{targetIsSuperAdmin && <span style={{ color: "var(--text-secondary)" }}> (a super_admin account can&apos;t be deactivated)</span>}
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Weekly target (leads)</span>
          <input
            type="number"
            name="weeklyTarget"
            min={0}
            defaultValue={targetUser.weeklyTarget ?? ""}
            placeholder="No target set"
            style={inputStyle}
          />
        </label>

        <div>
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Roles</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
            {allRoles.map((r) => (
              <label key={r.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                <input
                  type="checkbox"
                  name="roleIds"
                  value={r.id}
                  defaultChecked={currentRoleIds.includes(r.id)}
                  style={{ width: 16, height: 16 }}
                />
                {r.name}
              </label>
            ))}
          </div>
        </div>

        <button
          type="submit"
          style={{ padding: "10px 0", borderRadius: 6, border: "none", background: "var(--accent)", color: "white", fontWeight: 500, cursor: "pointer" }}
        >
          Save
        </button>
      </form>

      <div style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid var(--glass-border)" }}>
        {!targetIsSuperAdmin && (
          <Link
            href={`/admin/users/${id}/permissions`}
            style={{ fontSize: 13, color: "var(--accent)", display: "inline-block", marginBottom: 16 }}
          >
            Edit individual permissions →
          </Link>
        )}
        <ForceResetButton userId={id} />
      </div>
    </main>
  );
}
