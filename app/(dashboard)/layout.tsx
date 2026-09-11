import { Suspense } from "react";
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
import NavLinks from "./NavLinks";

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
 *
 * The nav-only permission checks (which admin links to show, the
 * intake due-count badge) used to be awaited here too, before the
 * `return` — since a layout's own awaits block everything below it,
 * that meant every dashboard page waited on 3+ extra sequential DB
 * round-trips before even its OWN Suspense boundaries could start,
 * silently defeating the per-page skeleton work (Pavan, 2026-09-11:
 * "pages are not loading fast, it is as it was before"). Moved into
 * <NavData>, its own Suspense boundary, so {children} — and whatever
 * Suspense the page itself sets up — starts streaming immediately
 * instead of waiting on nav-only data it doesn't need.
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
        <Suspense fallback={<NavLinks canManageUsers={false} canManageRoles={false} isSuperAdminUser={false} dueCount={0} />}>
          <NavData userId={current.id} />
        </Suspense>

        <form
          action={signOutAction}
          style={{ marginTop: "auto", paddingTop: 12, borderTop: "1px solid var(--glass-border)" }}
        >
          <button
            type="submit"
            className="nav-link danger"
            style={{
              background: "none",
              border: "none",
              width: "100%",
              textAlign: "left",
              cursor: "pointer",
              fontFamily: "inherit",
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

async function NavData({ userId }: { userId: number }) {
  const [canManageUsers, canManageRoles, isSuperAdminUser, dueCount] = await Promise.all([
    can(userId, "users.manage"),
    can(userId, "roles.manage"),
    // Audit Log visibility is hardcoded to super_admin only, deliberately
    // NOT tied to roles.manage — a Manager can hold that permission for
    // day-to-day role work without also seeing this (Pavan, 2026-09-01:
    // "not even manager").
    isSuperAdmin(userId),
    getDueFollowUpCount(userId),
  ]);

  return <NavLinks canManageUsers={canManageUsers} canManageRoles={canManageRoles} isSuperAdminUser={isSuperAdminUser} dueCount={dueCount ?? 0} />;
}
