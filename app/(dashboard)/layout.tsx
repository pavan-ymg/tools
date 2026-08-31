import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { can } from "@/lib/permissions";
import { getDueFollowUpCount } from "@/lib/intake-stats";
import { isSuperAdmin } from "./admin/users/actions";
import { signOutAction } from "./actions";

/**
 * Gate for every dashboard route. proxy.ts only checks "is there a
 * session at all" (cheap, runs on the edge, no DB). This layout does
 * the state-sensitive checks that must be correct on THIS request, not
 * whatever was true when the token was issued up to 8h ago:
 *
 *  - account deactivated since login -> signed out
 *  - password changed since this token was issued (sessionVersion
 *    mismatch) -> signed out, forcing a fresh login (§3.6.2)
 *  - must change password (bootstrap / admin force-reset) -> redirected
 *    to /change-password, which lives outside this layout so it isn't
 *    itself gated by the same check
 *
 * Deliberately NOT baked into the JWT (§3.6.3): permission-adjacent
 * account state has to take effect immediately, not survive until the
 * token expires.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [current] = await db
    .select()
    .from(users)
    .where(eq(users.id, Number(session.user.id)))
    .limit(1);

  if (!current || !current.isActive || current.sessionVersion !== session.user.sessionVersion) {
    redirect("/force-logout");
  }

  if (current.mustChangePassword) {
    redirect("/change-password");
  }

  const canManageUsers = await can(current.id, "users.manage");
  const canManageRoles = await can(current.id, "roles.manage");
  // Audit Log visibility is hardcoded to super_admin only, deliberately
  // NOT tied to roles.manage — a Manager can hold that permission for
  // day-to-day role work without also seeing this (Pavan, 2026-09-01:
  // "not even manager").
  const isSuperAdminUser = await isSuperAdmin(current.id);
  const dueCount = await getDueFollowUpCount(current.id);

  const linkStyle: React.CSSProperties = {
    color: "var(--text-secondary)",
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 10px",
    borderRadius: 6,
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <nav
        style={{
          width: 200,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          gap: 2,
          padding: "20px 14px",
          borderRight: "1px solid var(--glass-border)",
          fontSize: 13,
          position: "sticky",
          top: 0,
          height: "100vh",
          overflowY: "auto",
        }}
      >
        <Link href="/" style={{ display: "flex", alignItems: "center", marginBottom: 28 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/ymg-legal-logo.svg" alt="YMG Legal" style={{ height: 48, width: "auto" }} />
        </Link>
        <Link href="/leads" style={linkStyle}>
          Lead Feed
        </Link>
        <Link href="/intake/new" style={linkStyle}>
          New Intake
        </Link>
        <Link href="/intake" style={linkStyle}>
          Intake Records
          {!!dueCount && (
            <span
              style={{
                background: "var(--danger)",
                color: "white",
                borderRadius: 999,
                fontSize: 11,
                lineHeight: 1,
                padding: "2px 6px",
              }}
            >
              {dueCount}
            </span>
          )}
        </Link>
        <Link href="/leaderboard" style={linkStyle}>
          Leaderboard
        </Link>
        {canManageUsers && (
          <Link href="/admin/users" style={linkStyle}>
            Users
          </Link>
        )}
        {canManageRoles && (
          <Link href="/admin/roles" style={linkStyle}>
            Roles
          </Link>
        )}
        {isSuperAdminUser && (
          <Link href="/admin/audit" style={linkStyle}>
            Audit Log
          </Link>
        )}

        <form action={signOutAction} style={{ marginTop: "auto", paddingTop: 20 }}>
          <button
            type="submit"
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-secondary)",
              fontSize: 13,
              cursor: "pointer",
              padding: "8px 10px",
              width: "100%",
              textAlign: "left",
            }}
          >
            Sign out
          </button>
        </form>
      </nav>

      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  );
}
