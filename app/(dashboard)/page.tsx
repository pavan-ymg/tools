import Link from "next/link";
import { eq, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, auditLog } from "@/db/schema";
import { can } from "@/lib/permissions";
import { getLeaderboard } from "@/lib/leaderboard";
import { getDueFollowUpCount } from "@/lib/intake-stats";
import { FORM_REGISTRY } from "@/lib/forms/registry";

const cardStyle: React.CSSProperties = {
  border: "1px solid var(--glass-border)",
  borderRadius: 8,
  padding: "16px 18px",
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

const statLabelStyle: React.CSSProperties = { fontSize: 12, color: "var(--text-secondary)" };
const statValueStyle: React.CSSProperties = { fontSize: 24, fontWeight: 600 };

export default async function DashboardHomePage() {
  const session = await auth();
  const userId = Number(session!.user.id);
  const userName = session!.user.name ?? "there";

  const [canViewLeaderboard, canManageUsers, canManageRoles] = await Promise.all([
    can(userId, "leaderboard.view"),
    can(userId, "users.manage"),
    can(userId, "roles.manage"),
  ]);

  // This week's points/rank/target — same weekly leaderboard computation
  // the Leaderboard page itself uses, just picking out this one user's
  // row rather than rendering the whole board.
  let myPoints: number | null = null;
  let myWorked: number | null = null;
  let myRank: number | null = null;
  let weeklyTarget: number | null = null;
  if (canViewLeaderboard) {
    const [board, [me]] = await Promise.all([
      getLeaderboard("week"),
      db.select({ weeklyTarget: users.weeklyTarget }).from(users).where(eq(users.id, userId)).limit(1),
    ]);
    const idx = board.findIndex((r) => r.ownerId === userId);
    if (idx !== -1) {
      myPoints = board[idx].points;
      myWorked = board[idx].recordsWorked;
      myRank = idx + 1;
    }
    weeklyTarget = me?.weeklyTarget ?? null;
  }

  const dueCount = await getDueFollowUpCount(userId);
  const canViewIntake = dueCount !== null;

  const recentAudit = canManageRoles ? await db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(5) : [];

  return (
    <main style={{ padding: 32, maxWidth: 960 }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24 }}>Welcome back, {userName}</h1>

      {(canViewLeaderboard || canViewIntake) && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 28 }}>
          {canViewLeaderboard && (
            <>
              <div style={cardStyle}>
                <span style={statLabelStyle}>This week&apos;s points</span>
                <span style={statValueStyle}>{myPoints ?? 0}</span>
              </div>
              <div style={cardStyle}>
                <span style={statLabelStyle}>Leaderboard rank</span>
                <span style={statValueStyle}>{myRank ? `#${myRank}` : "—"}</span>
              </div>
              <div style={cardStyle}>
                <span style={statLabelStyle}>Weekly target</span>
                <span style={statValueStyle}>{weeklyTarget !== null ? `${myWorked ?? 0}/${weeklyTarget}` : "—"}</span>
              </div>
            </>
          )}
          {canViewIntake && (
            <div style={cardStyle}>
              <span style={statLabelStyle}>Follow-ups due</span>
              <span style={{ ...statValueStyle, color: (dueCount ?? 0) > 0 ? "var(--danger)" : undefined }}>{dueCount ?? 0}</span>
            </div>
          )}
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 32 }}>
        <Link href="/leads" style={{ ...cardStyle, flex: "1 1 180px", textDecoration: "none", color: "var(--text-primary)" }}>
          <span style={{ fontWeight: 500, fontSize: 14 }}>Lead Feed</span>
          <span style={statLabelStyle}>Every LP submission as it arrives</span>
        </Link>
        {FORM_REGISTRY.length > 0 && (
          <Link href="/intake/new" style={{ ...cardStyle, flex: "1 1 180px", textDecoration: "none", color: "var(--text-primary)" }}>
            <span style={{ fontWeight: 500, fontSize: 14 }}>New Intake</span>
            <span style={statLabelStyle}>Log a call for a campaign</span>
          </Link>
        )}
        <Link href="/intake" style={{ ...cardStyle, flex: "1 1 180px", textDecoration: "none", color: "var(--text-primary)" }}>
          <span style={{ fontWeight: 500, fontSize: 14 }}>Intake Records</span>
          <span style={statLabelStyle}>{dueCount ? `${dueCount} due for follow-up` : "Search and review past calls"}</span>
        </Link>
        {canViewLeaderboard && (
          <Link href="/leaderboard" style={{ ...cardStyle, flex: "1 1 180px", textDecoration: "none", color: "var(--text-primary)" }}>
            <span style={{ fontWeight: 500, fontSize: 14 }}>Leaderboard</span>
            <span style={statLabelStyle}>See where everyone stands</span>
          </Link>
        )}
      </div>

      {canManageRoles && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600 }}>Recent admin activity</h2>
            <Link href="/admin/audit" style={{ fontSize: 13, color: "var(--accent)" }}>
              View full log →
            </Link>
          </div>
          <div style={{ border: "1px solid var(--glass-border)", borderRadius: 8 }}>
            {recentAudit.length === 0 && (
              <p style={{ padding: 16, color: "var(--text-secondary)", fontSize: 13 }}>No admin actions logged yet.</p>
            )}
            {recentAudit.map((e, i) => (
              <div
                key={e.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  fontSize: 13,
                  borderBottom: i < recentAudit.length - 1 ? "1px solid var(--glass-border)" : undefined,
                }}
              >
                <span>
                  <span style={{ color: "var(--text-secondary)" }}>{e.actorLabel}</span>{" "}
                  {e.action.replace(/_/g, " ")} <span style={{ color: "var(--text-secondary)" }}>{e.targetLabel}</span>
                </span>
                <span style={{ color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{e.createdAt.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {canManageUsers && !canManageRoles && (
        <Link href="/admin/users" style={{ fontSize: 13, color: "var(--accent)" }}>
          Manage users →
        </Link>
      )}
    </main>
  );
}
