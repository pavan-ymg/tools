import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { can, SCOPE_RANK, type Scope } from "@/lib/permissions";
import { getUserPermissionOverrideData, updateUserPermissionOverridesAction, isSuperAdmin } from "../../actions";

const SCOPE_COLUMNS = [
  { value: "own", label: "Own" },
  { value: "team", label: "Team" },
  { value: "all", label: "All" },
] as const;

const ROLE_LABEL: Record<Scope, string> = { own: "Own", team: "Team", all: "All" };

export default async function UserPermissionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idParam } = await params;
  const id = Number(idParam);
  if (Number.isNaN(id)) notFound();

  const session = await auth();
  const currentUserId = Number(session!.user.id);

  // Same gate as editing a role's own permission matrix — this screen
  // is the same capability, scoped to one person instead of a role.
  if (!(await can(currentUserId, "roles.manage"))) {
    return (
      <main style={{ padding: 32 }}>
        <p style={{ color: "var(--text-secondary)" }}>You don&apos;t have permission to edit individual permissions.</p>
      </main>
    );
  }

  const [targetUser, targetIsSuperAdmin] = await Promise.all([
    db.select().from(users).where(eq(users.id, id)).limit(1).then((r) => r[0]),
    isSuperAdmin(id),
  ]);
  if (!targetUser) notFound();

  if (targetIsSuperAdmin) {
    return (
      <main style={{ padding: 32 }}>
        <div style={{ marginBottom: 4 }}>
          <Link href={`/admin/users/${id}`} style={{ fontSize: 13, color: "var(--accent)" }}>
            ← Back to {targetUser.name}
          </Link>
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>{targetUser.name}</h1>
        <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          This is a super_admin account — it bypasses every permission check in the app and can&apos;t be overridden here.
        </p>
      </main>
    );
  }

  const { managerName, rows } = await getUserPermissionOverrideData(id);
  const boundUpdate = updateUserPermissionOverridesAction.bind(null, id);

  return (
    <main style={{ padding: 32, maxWidth: 820 }}>
      <div style={{ marginBottom: 4 }}>
        <Link href={`/admin/users/${id}`} style={{ fontSize: 13, color: "var(--accent)" }}>
          ← Back to {targetUser.name}
        </Link>
      </div>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Edit permissions — {targetUser.name}</h1>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 8 }}>
        An override here always wins over what {targetUser.name}&apos;s role(s) grant, for that one capability only.
        Leave a row on &quot;Role default&quot; to keep using whatever their role says.
      </p>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 24 }}>
        {managerName
          ? `Capped by their manager, ${managerName}: an override can never reach further than ${managerName} already has for that capability.`
          : "This user has no manager on file, so no cap applies here."}
      </p>

      <form action={boundUpdate} style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr repeat(5, 88px)",
            gap: 8,
            padding: "8px 12px",
            fontSize: 12,
            color: "var(--text-secondary)",
            borderBottom: "1px solid var(--glass-border)",
          }}
        >
          <span>Capability</span>
          <span style={{ textAlign: "center" }}>Role default</span>
          <span style={{ textAlign: "center" }}>None</span>
          {SCOPE_COLUMNS.map((col) => (
            <span key={col.label} style={{ textAlign: "center" }}>
              {col.label}
            </span>
          ))}
        </div>

        {rows.map((row) => {
          const capRank = row.managerCapScope ? SCOPE_RANK[row.managerCapScope] : Infinity;
          const current = row.overrideScope ?? "";
          return (
            <div
              key={row.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr repeat(5, 88px)",
                gap: 8,
                alignItems: "center",
                padding: "10px 12px",
                fontSize: 13,
                borderBottom: "1px solid var(--glass-border)",
              }}
            >
              <span>
                {row.description}
                <br />
                <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                  Role default: {row.roleScope ? ROLE_LABEL[row.roleScope] : "None"}
                  {managerName ? ` · manager has: ${row.managerCapScope ? ROLE_LABEL[row.managerCapScope] : "None"}` : ""}
                </span>
              </span>
              <span style={{ textAlign: "center" }}>
                <input type="radio" name={`override_${row.id}`} value="" defaultChecked={current === ""} style={{ width: 16, height: 16 }} />
              </span>
              <span style={{ textAlign: "center" }}>
                <input type="radio" name={`override_${row.id}`} value="none" defaultChecked={current === "none"} style={{ width: 16, height: 16 }} />
              </span>
              {SCOPE_COLUMNS.map((col) => {
                const disabled = SCOPE_RANK[col.value] > capRank;
                return (
                  <span key={col.label} style={{ textAlign: "center" }}>
                    <input
                      type="radio"
                      name={`override_${row.id}`}
                      value={col.value}
                      defaultChecked={current === col.value}
                      disabled={disabled}
                      title={disabled ? `Capped by manager's access (${row.managerCapScope ? ROLE_LABEL[row.managerCapScope] : "None"})` : undefined}
                      style={{ width: 16, height: 16 }}
                    />
                  </span>
                );
              })}
            </div>
          );
        })}

        <button
          type="submit"
          style={{
            marginTop: 20,
            alignSelf: "flex-start",
            padding: "10px 24px",
            borderRadius: 6,
            border: "none",
            background: "var(--accent)",
            color: "white",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Save overrides
        </button>
      </form>
    </main>
  );
}
