import { auth } from "@/lib/auth";
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

  return (
    <main style={{ padding: 32 }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24 }}>New role</h1>
      <NewRoleForm />
    </main>
  );
}
