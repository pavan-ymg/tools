import Link from "next/link";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { listAssignableRoles, listManagerCandidates } from "../actions";
import InviteUserForm from "./InviteUserForm";

export default async function InviteUserPage() {
  const session = await auth();
  const userId = Number(session!.user.id);

  if (!(await can(userId, "users.manage"))) {
    return (
      <main style={{ padding: 32 }}>
        <p style={{ color: "var(--text-secondary)" }}>You don&apos;t have permission to invite users.</p>
      </main>
    );
  }

  const [roles, managers] = await Promise.all([listAssignableRoles(), listManagerCandidates()]);

  return (
    <main style={{ padding: 32 }}>
      <div style={{ marginBottom: 4 }}>
        <Link href="/admin/users" style={{ fontSize: 13, color: "var(--accent)" }}>
          ← Back to Users
        </Link>
      </div>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24 }}>Invite a user</h1>
      <InviteUserForm roles={roles} managers={managers} />
    </main>
  );
}
