import { desc, or, ilike } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { leadIndex } from "@/db/schema";
import { can } from "@/lib/permissions";
import { syncLeads } from "@/lib/lead-sync";
import LeadsTable from "./LeadsTable";
import RefreshButton from "./RefreshButton";

const PAGE_SIZE = 50;

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
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

  const { page: pageParam, q } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const query = q?.trim();

  const searchFilter = query
    ? or(
        ilike(leadIndex.name, `%${query}%`),
        ilike(leadIndex.phone, `%${query}%`),
        ilike(leadIndex.email, `%${query}%`),
        ilike(leadIndex.slug, `%${query}%`)
      )
    : undefined;

  let leadsQuery = db.select().from(leadIndex).$dynamic();
  if (searchFilter) leadsQuery = leadsQuery.where(searchFilter);

  const rows = await leadsQuery
    .orderBy(desc(leadIndex.leadCreatedAt))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  const leadRows = rows.map((row) => ({
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    domain: row.domain,
    slug: row.slug,
    state: row.state,
    leadCreatedAt: row.leadCreatedAt.toISOString(),
  }));

  return (
    <main style={{ padding: 32 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>Lead Feed</h1>
        <RefreshButton />
        <p style={{ fontSize: 13, color: "var(--text-secondary)", justifySelf: "end" }}>
          {session!.user.email} — {session!.user.roles?.join(", ")}
        </p>
      </div>

      {syncError && (
        <p style={{ color: "var(--danger)", fontSize: 13, marginBottom: 16 }}>
          Couldn&apos;t sync new leads right now ({syncError}) — showing the last
          synced data.
        </p>
      )}

      <form method="GET" style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input
          name="q"
          type="text"
          defaultValue={query ?? ""}
          placeholder="Search name, phone, email, or LP slug…"
          style={{
            padding: "8px 12px",
            borderRadius: 6,
            border: "1px solid var(--glass-border)",
            background: "rgba(0,0,0,0.2)",
            color: "var(--text-primary)",
            width: 320,
            maxWidth: "100%",
          }}
        />
        <button
          type="submit"
          style={{
            padding: "8px 16px",
            borderRadius: 6,
            border: "1px solid var(--glass-border)",
            background: "transparent",
            color: "var(--accent)",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Search
        </button>
        {query && (
          <a
            href="/leads"
            style={{ display: "flex", alignItems: "center", color: "var(--text-secondary)", fontSize: 13 }}
          >
            Clear
          </a>
        )}
      </form>

      <LeadsTable rows={leadRows} />

      <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
        {page > 1 && (
          <a href={`/leads?page=${page - 1}${query ? `&q=${encodeURIComponent(query)}` : ""}`} style={{ color: "var(--accent)", fontSize: 13 }}>
            ← Newer
          </a>
        )}
        {rows.length === PAGE_SIZE && (
          <a href={`/leads?page=${page + 1}${query ? `&q=${encodeURIComponent(query)}` : ""}`} style={{ color: "var(--accent)", fontSize: 13 }}>
            Older →
          </a>
        )}
      </div>
    </main>
  );
}
