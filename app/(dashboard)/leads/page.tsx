import { desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { leadIndex } from "@/db/schema";
import { can } from "@/lib/permissions";
import { syncLeads } from "@/lib/lead-sync";
import { maskPhone, maskEmail } from "@/lib/mask";
import LeadsTable from "./LeadsTable";

const PAGE_SIZE = 50;

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  const userId = Number(session!.user.id);

  if (!(await can(userId, "leads.view"))) {
    return (
      <main style={{ padding: 32 }}>
        <p style={{ color: "var(--text-secondary)" }}>
          You don&apos;t have permission to view the lead feed.
        </p>
      </main>
    );
  }

  // Sync-on-demand (§3.2) — no cron. Fresh as of whoever last opened
  // this page, which is fresher than any fixed polling interval anyway.
  let syncError: string | null = null;
  try {
    await syncLeads();
  } catch (err) {
    // The feed still works from whatever's already in lead_index — a
    // core-api hiccup makes the page stale, not broken.
    syncError = err instanceof Error ? err.message : "Sync failed.";
  }

  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const rows = await db
    .select()
    .from(leadIndex)
    .orderBy(desc(leadIndex.leadCreatedAt))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  // Masked here, server-side, before this data becomes props to a
  // client component (§5.3) — the real values only ever reach the
  // client through the reveal action's own round-trip.
  const maskedRows = rows.map((row) => ({
    id: row.id,
    name: row.name,
    phone: maskPhone(row.phone),
    email: maskEmail(row.email),
    domain: row.domain,
    slug: row.slug,
    state: row.state,
    leadCreatedAt: row.leadCreatedAt.toISOString(),
  }));

  return (
    <main style={{ padding: 32 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>Lead Feed</h1>
        <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          {session!.user.email} — {session!.user.roles?.join(", ")}
        </p>
      </div>

      {syncError && (
        <p style={{ color: "var(--danger)", fontSize: 13, marginBottom: 16 }}>
          Couldn&apos;t sync new leads right now ({syncError}) — showing the last
          synced data.
        </p>
      )}

      <LeadsTable rows={maskedRows} />

      <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
        {page > 1 && (
          <a href={`/leads?page=${page - 1}`} style={{ color: "var(--accent)", fontSize: 13 }}>
            ← Newer
          </a>
        )}
        {rows.length === PAGE_SIZE && (
          <a href={`/leads?page=${page + 1}`} style={{ color: "var(--accent)", fontSize: 13 }}>
            Older →
          </a>
        )}
      </div>
    </main>
  );
}
