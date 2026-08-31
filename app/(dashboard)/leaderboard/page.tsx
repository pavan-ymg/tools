import Link from "next/link";
import { inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { getScope, subordinateIds } from "@/lib/permissions";
import { getLeaderboard, type TimeWindow, type LeaderboardRow } from "@/lib/leaderboard";

const TOP_N_FOR_OWN_SCOPE = 5;
const WINDOWS: { key: TimeWindow; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
  { key: "all", label: "All time" },
];

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ window?: string }>;
}) {
  const session = await auth();
  const userId = Number(session!.user.id);

  const scope = await getScope(userId, "leaderboard.view");
  if (!scope) {
    return (
      <main style={{ padding: 32 }}>
        <p style={{ color: "var(--text-secondary)" }}>You don&apos;t have permission to view the leaderboard.</p>
      </main>
    );
  }

  const { window: windowParam } = await searchParams;
  const window = (WINDOWS.some((w) => w.key === windowParam) ? windowParam : "week") as TimeWindow;

  const fullBoard = await getLeaderboard(window);

  // Target is always a WEEKLY goal regardless of which window tab is
  // selected — reuse the "week" board's worked count for progress
  // rather than a separate implementation, whichever tab is active.
  const weeklyBoard = window === "week" ? fullBoard : await getLeaderboard("week");
  const weeklyWorkedByOwner = new Map(weeklyBoard.map((r) => [r.ownerId, r.recordsWorked]));

  const ownerIds = fullBoard.map((r) => r.ownerId);
  const targetByOwner = new Map(
    ownerIds.length > 0
      ? (await db.select({ id: users.id, weeklyTarget: users.weeklyTarget }).from(users).where(inArray(users.id, ownerIds))).map(
          (u) => [u.id, u.weeklyTarget] as const
        )
      : []
  );

  // What gets DISPLAYED depends on scope — the underlying computation
  // above always covers everyone (§7.3 / lib/leaderboard.ts comment).
  let visibleRows: LeaderboardRow[];
  let ownRank: number | null = null;

  if (scope === "all") {
    visibleRows = fullBoard;
  } else if (scope === "team") {
    const teamIds = new Set([userId, ...(await subordinateIds(userId))]);
    visibleRows = fullBoard.filter((r) => teamIds.has(r.ownerId));
  } else {
    // own: top N + the viewer's own row, wherever it falls
    const myIndex = fullBoard.findIndex((r) => r.ownerId === userId);
    ownRank = myIndex === -1 ? null : myIndex + 1;
    const topN = fullBoard.slice(0, TOP_N_FOR_OWN_SCOPE);
    const meIncluded = topN.some((r) => r.ownerId === userId);
    visibleRows = meIncluded || myIndex === -1 ? topN : [...topN, fullBoard[myIndex]];
  }

  return (
    <main style={{ padding: 32 }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>Leaderboard</h1>

      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        {WINDOWS.map((w) => (
          <Link
            key={w.key}
            href={`/leaderboard?window=${w.key}`}
            style={{
              fontSize: 13,
              padding: "6px 12px",
              borderRadius: 6,
              border: "1px solid var(--glass-border)",
              background: window === w.key ? "var(--accent)" : "transparent",
              color: window === w.key ? "white" : "var(--text-secondary)",
              textDecoration: "none",
            }}
          >
            {w.label}
          </Link>
        ))}
      </div>

      {scope === "own" && ownRank && (
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
          Your rank: #{ownRank} of {fullBoard.length}
        </p>
      )}

      <div style={{ overflowX: "auto", border: "1px solid var(--glass-border)", borderRadius: 8 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "rgba(255,255,255,0.03)" }}>
              {["#", "Agent", "Points", "Leads", "Qualified", "Target", "Contacted"].map((h) => (
                <th
                  key={h}
                  style={{ padding: "10px 14px", textAlign: "left", fontSize: 13, color: "var(--text-secondary)", borderBottom: "1px solid var(--glass-border)" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => {
              const rank = fullBoard.findIndex((r) => r.ownerId === row.ownerId) + 1;
              const isMe = row.ownerId === userId;
              const target = targetByOwner.get(row.ownerId) ?? null;
              const weeklyWorked = weeklyWorkedByOwner.get(row.ownerId) ?? 0;
              return (
                <tr key={row.ownerId} style={isMe ? { background: "rgba(59,130,246,0.08)" } : undefined}>
                  <td style={{ padding: "10px 14px", fontSize: 13, borderBottom: "1px solid var(--glass-border)" }}>{rank}</td>
                  <td style={{ padding: "10px 14px", fontSize: 13, borderBottom: "1px solid var(--glass-border)" }}>
                    {row.ownerName}
                    {isMe ? " (you)" : ""}
                  </td>
                  <td style={{ padding: "10px 14px", fontSize: 13, borderBottom: "1px solid var(--glass-border)" }}>{row.points}</td>
                  <td style={{ padding: "10px 14px", fontSize: 13, borderBottom: "1px solid var(--glass-border)" }}>{row.recordsWorked}</td>
                  <td style={{ padding: "10px 14px", fontSize: 13, borderBottom: "1px solid var(--glass-border)" }}>{row.scoredByTl}</td>
                  <td style={{ padding: "10px 14px", fontSize: 13, borderBottom: "1px solid var(--glass-border)" }}>
                    {target !== null ? `${weeklyWorked}/${target}` : "—"}
                  </td>
                  <td style={{ padding: "10px 14px", fontSize: 13, borderBottom: "1px solid var(--glass-border)" }}>
                    {row.contacted} ({row.contactRate}%)
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {visibleRows.length === 0 && (
          <p style={{ padding: 24, color: "var(--text-secondary)", fontSize: 13 }}>No activity in this window yet.</p>
        )}
      </div>
    </main>
  );
}
