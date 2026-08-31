import Link from "next/link";
import { eq, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, auditLog } from "@/db/schema";
import { can, getScope, subordinateIds } from "@/lib/permissions";
import { getLeaderboard } from "@/lib/leaderboard";
import { getDueFollowUpCount } from "@/lib/intake-stats";
import { isSuperAdmin } from "./admin/users/actions";
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

  const [leaderboardScope, canManageUsers] = await Promise.all([
    getScope(userId, "leaderboard.view"),
    can(userId, "users.manage"),
  ]);
  const canViewLeaderboard = leaderboardScope !== null;

  // Same own/team/all scope every other screen in this app already
  // enforces (Pavan, 2026-09-01: "agents will see its things TL will
  // see teams and Manager will see all") — an Agent's dashboard is about
  // THEM, a TL's is about their team, a Manager's is company-wide. The
  // underlying computation always covers everyone (see lib/leaderboard.ts);
  // what differs here is what gets aggregated and shown.
  let myPoints = 0;
  let myWorked = 0;
  let myRank: number | null = null;
  let weeklyTarget: number | null = null;
  let groupSummary: { label: string; points: number; activeCount: number; topName: string | null; topPoints: number } | null = null;

  if (leaderboardScope) {
    const [board, [me]] = await Promise.all([
      getLeaderboard("week"),
      db.select({ weeklyTarget: users.weeklyTarget }).from(users).where(eq(users.id, userId)).limit(1),
    ]);
    weeklyTarget = me?.weeklyTarget ?? null;

    const idx = board.findIndex((r) => r.ownerId === userId);
    if (idx !== -1) {
      myPoints = board[idx].points;
      myWorked = board[idx].recordsWorked;
      myRank = idx + 1;
    }

    if (leaderboardScope !== "own") {
      const teamMemberIds = leaderboardScope === "team" ? await subordinateIds(userId) : [];
      const visibleRows =
        leaderboardScope === "team"
          ? (() => {
              const teamIds = new Set<number>([userId, ...teamMemberIds]);
              return board.filter((r) => teamIds.has(r.ownerId));
            })()
          : board;
      // board is already sorted desc by points (lib/leaderboard.ts), and
      // filtering preserves that order — visibleRows[0] is the top
      // performer within this scope without a second sort.
      groupSummary = {
        label: leaderboardScope === "team" ? "Team" : "Company",
        points: Math.round(visibleRows.reduce((sum, r) => sum + r.points, 0) * 10) / 10,
        activeCount: visibleRows.length,
        topName: visibleRows[0]?.ownerName ?? null,
        topPoints: visibleRows[0]?.points ?? 0,
      };
    }
  }

  const dueCount = await getDueFollowUpCount(userId);
  const canViewIntake = dueCount !== null;

  // Same hardcoded super_admin-only rule as the Audit Log page itself
  // (Pavan, 2026-09-01: "not even manager") — roles.manage alone isn't
  // enough to see this summary either.
  const isSuperAdminUser = await isSuperAdmin(userId);
  const recentAudit = isSuperAdminUser ? await db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(5) : [];

  return (
    <main style={{ padding: 32, maxWidth: 960 }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24 }}>Welcome back, {userName}</h1>

      {(canViewLeaderboard || canViewIntake) && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 28 }}>
          {canViewLeaderboard && !groupSummary && (
            <>
              <div style={cardStyle}>
                <span style={statLabelStyle}>This week&apos;s points</span>
                <span style={statValueStyle}>{myPoints}</span>
              </div>
              <div style={cardStyle}>
                <span style={statLabelStyle}>Leaderboard rank</span>
                <span style={statValueStyle}>{myRank ? `#${myRank}` : "—"}</span>
              </div>
            </>
          )}
          {groupSummary && (
            <>
              <div style={cardStyle}>
                <span style={statLabelStyle}>{groupSummary.label} points this week</span>
                <span style={statValueStyle}>{groupSummary.points}</span>
              </div>
              <div style={cardStyle}>
                <span style={statLabelStyle}>Active agents</span>
                <span style={statValueStyle}>{groupSummary.activeCount}</span>
              </div>
              <div style={cardStyle}>
                <span style={statLabelStyle}>Top performer</span>
                <span style={{ ...statValueStyle, fontSize: 16 }}>
                  {groupSummary.topName ? `${groupSummary.topName} (${groupSummary.topPoints})` : "—"}
                </span>
              </div>
            </>
          )}
          {canViewLeaderboard && (
            <div style={cardStyle}>
              <span style={statLabelStyle}>Weekly target</span>
              <span style={statValueStyle}>{weeklyTarget !== null ? `${myWorked}/${weeklyTarget}` : "—"}</span>
            </div>
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

      {isSuperAdminUser && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600 }}>Recent admin activity</h2>
            <Link
              href="/admin/audit"
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "var(--accent)",
                border: "1px solid var(--glass-border)",
                borderRadius: 6,
                padding: "6px 12px",
                textDecoration: "none",
              }}
            >
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

      {canManageUsers && !isSuperAdminUser && (
        <Link
          href="/admin/users"
          style={{
            display: "inline-block",
            fontSize: 13,
            fontWeight: 500,
            color: "var(--accent)",
            border: "1px solid var(--glass-border)",
            borderRadius: 6,
            padding: "8px 14px",
            textDecoration: "none",
          }}
        >
          Manage users →
        </Link>
      )}
    </main>
  );
}
