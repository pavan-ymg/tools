import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { roles } from "@/db/schema";
import { can } from "@/lib/permissions";
import NewRoleForm from "./NewRoleForm";

export default async function NewRolePage() {
  const session = await auth();
  const userId = Number(session!.user.id);

  if (!(await can(userId, "roles.manage"))) {
    return (
      <main style={{ padding: 32 }}>
        <p style={{ color: "var(--text-secondary)" }}>You don&apos;t have permission to create roles.</p>
      </main>
    );
  }

  // Only non-system roles are offered as a starting point — super_admin
  // has no role_permissions rows to copy from anyway (§5.14, its access
  // bypasses the check system entirely, not driven by grants).
  const cloneableRoles = await db.select().from(roles).where(eq(roles.isSystem, false)).orderBy(roles.name);

  return (
    <main style={{ padding: 32 }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24 }}>New role</h1>
      <NewRoleForm cloneableRoles={cloneableRoles} />
    </main>
  );
}
