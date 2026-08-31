import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { roles, permissions, rolePermissions } from "@/db/schema";
import { can } from "@/lib/permissions";
import { updateRolePermissionsAction } from "../actions";
import BackLink from "@/app/(dashboard)/BackLink";
import SuccessModal from "@/app/(dashboard)/SuccessModal";

const SCOPE_COLUMNS = [
  { value: "", label: "None" },
  { value: "own", label: "Own" },
  { value: "team", label: "Team" },
  { value: "all", label: "All" },
] as const;

export default async function EditRolePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idParam } = await params;
  const id = Number(idParam);
  if (Number.isNaN(id)) notFound();

  const session = await auth();
  const currentUserId = Number(session!.user.id);

  if (!(await can(currentUserId, "roles.manage"))) {
    return (
      <main style={{ padding: 32 }}>
        <p style={{ color: "var(--text-secondary)" }}>You don&apos;t have permission to manage roles.</p>
      </main>
    );
  }

  const [role] = await db.select().from(roles).where(eq(roles.id, id)).limit(1);
  if (!role) notFound();

  if (role.isSystem) {
    return (
      <main style={{ padding: 32 }}>
        <BackLink href="/admin/roles" label="Back to Roles" />
        <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>{role.name}</h1>
        <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          This is a system role — it bypasses every permission check in the app and can&apos;t be edited here.
        </p>
      </main>
    );
  }

  const [allPermissions, currentGrants] = await Promise.all([
    db.select().from(permissions).orderBy(permissions.key),
    db.select().from(rolePermissions).where(eq(rolePermissions.roleId, id)),
  ]);

  const scopeByPermissionId = new Map(currentGrants.map((g) => [g.permissionId, g.scope as string]));
  const boundUpdate = updateRolePermissionsAction.bind(null, id);

  return (
    <main style={{ padding: 32, maxWidth: 720 }}>
      <BackLink href="/admin/roles" label="Back to Roles" />
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>{role.name}</h1>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 24 }}>
        Choose how much of the company&apos;s data this role can act on, for each capability.
      </p>

      <SuccessModal param="saved" message="Permissions saved." />

      <form action={boundUpdate} style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr repeat(4, 72px)",
            gap: 8,
            padding: "8px 12px",
            fontSize: 12,
            color: "var(--text-secondary)",
            borderBottom: "1px solid var(--glass-border)",
          }}
        >
          <span>Capability</span>
          {SCOPE_COLUMNS.map((col) => (
            <span key={col.label} style={{ textAlign: "center" }}>
              {col.label}
            </span>
          ))}
        </div>

        {allPermissions.map((p) => {
          const current = scopeByPermissionId.get(p.id) ?? "";
          return (
            <div
              key={p.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr repeat(4, 72px)",
                gap: 8,
                alignItems: "center",
                padding: "10px 12px",
                fontSize: 13,
                borderBottom: "1px solid var(--glass-border)",
              }}
            >
              <span>{p.description}</span>
              {SCOPE_COLUMNS.map((col) => (
                <span key={col.label} style={{ textAlign: "center" }}>
                  <input
                    type="radio"
                    name={`scope_${p.id}`}
                    value={col.value}
                    defaultChecked={current === col.value}
                    style={{ width: 16, height: 16 }}
                  />
                </span>
              ))}
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
            color: "var(--accent-text)",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Save permissions
        </button>
      </form>
    </main>
  );
}
