import Link from "next/link";
import { desc, or, ilike, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { leadIndex } from "@/db/schema";
import { can } from "@/lib/permissions";
import { syncLeads } from "@/lib/lead-sync";
import LeadsTable from "./LeadsTable";
import RefreshButton from "./RefreshButton";

// Nobody sees more than the HARD_CAP most recent leads, full stop
// (Pavan, 2026-09-01: "no one should be able to see more than 100
// contacts") — page-size options only let you choose how those capped
// 100 are chunked, never a way to see further back than that.
const HARD_CAP = 100;
const PAGE_SIZES = [10, 20, 50, 100] as const;
type PageSize = (typeof PAGE_SIZES)[number];
const DEFAULT_PAGE_SIZE: PageSize = 20;

function parsePageSize(raw: string | undefined): PageSize {
  const n = Number(raw);
  return (PAGE_SIZES as readonly number[]).includes(n) ? (n as PageSize) : DEFAULT_PAGE_SIZE;
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; pageSize?: string }>;
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

  const { page: pageParam, q, pageSize: pageSizeParam } = await searchParams;
  const pageSize = parsePageSize(pageSizeParam);
  const query = q?.trim();

  const searchFilter = query
    ? or(
        ilike(leadIndex.name, `%${query}%`),
        ilike(leadIndex.phone, `%${query}%`),
        ilike(leadIndex.email, `%${query}%`),
        ilike(leadIndex.slug, `%${query}%`)
      )
    : undefined;

  let countQuery = db.select({ count: sql<number>`count(*)::int` }).from(leadIndex).$dynamic();
  if (searchFilter) countQuery = countQuery.where(searchFilter);
  const [{ count: rawCount }] = await countQuery;
  const totalCount = Math.min(rawCount, HARD_CAP);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const page = Math.min(Math.max(1, Number(pageParam) || 1), totalPages);

  const pageUrl = (targetPage: number) =>
    `/leads?page=${targetPage}&pageSize=${pageSize}${query ? `&q=${encodeURIComponent(query)}` : ""}`;

  let leadsQuery = db.select().from(leadIndex).$dynamic();
  if (searchFilter) leadsQuery = leadsQuery.where(searchFilter);
  // ORDER BY + LIMIT/OFFSET bounded by totalPages (itself derived from
  // the capped totalCount above) means offset+limit can never reach
  // past row 100 of the most-recent-first ordering — the cap holds
  // without a separate subquery.
  const rows = await leadsQuery
    .orderBy(desc(leadIndex.leadCreatedAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

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
        <input type="hidden" name="pageSize" value={pageSize} />
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
            href={`/leads?pageSize=${pageSize}`}
            className="text-link"
            style={{ display: "flex", alignItems: "center", color: "var(--text-secondary)", fontSize: 13 }}
          >
            Clear
          </a>
        )}
      </form>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
          <span style={{ color: "var(--text-secondary)" }}>Show:</span>
          {PAGE_SIZES.map((size) => (
            <Link
              key={size}
              href={`/leads?pageSize=${size}${query ? `&q=${encodeURIComponent(query)}` : ""}`}
              className="chip"
              style={{
                padding: "4px 10px",
                borderRadius: 6,
                border: "1px solid var(--glass-border)",
                background: pageSize === size ? "var(--accent)" : "transparent",
                color: pageSize === size ? "var(--accent-text)" : "var(--text-secondary)",
                textDecoration: "none",
              }}
            >
              {size}
            </Link>
          ))}
        </div>
        <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          {totalCount === 0 ? "No leads" : `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, totalCount)} of ${totalCount}`}
          {rawCount > HARD_CAP ? ` (most recent ${HARD_CAP})` : ""}
        </span>
      </div>

      <LeadsTable rows={leadRows} />

      {totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16 }}>
          {page > 1 ? (
            <Link href={pageUrl(1)} style={{ color: "var(--accent)", fontSize: 13 }}>
              « First
            </Link>
          ) : (
            <span style={{ color: "var(--text-secondary)", fontSize: 13, opacity: 0.4 }}>« First</span>
          )}
          {page > 1 ? (
            <Link href={pageUrl(page - 1)} style={{ color: "var(--accent)", fontSize: 13 }}>
              ← Prev
            </Link>
          ) : (
            <span style={{ color: "var(--text-secondary)", fontSize: 13, opacity: 0.4 }}>← Prev</span>
          )}
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Link href={pageUrl(page + 1)} style={{ color: "var(--accent)", fontSize: 13 }}>
              Next →
            </Link>
          ) : (
            <span style={{ color: "var(--text-secondary)", fontSize: 13, opacity: 0.4 }}>Next →</span>
          )}
          {page < totalPages ? (
            <Link href={pageUrl(totalPages)} style={{ color: "var(--accent)", fontSize: 13 }}>
              Last »
            </Link>
          ) : (
            <span style={{ color: "var(--text-secondary)", fontSize: 13, opacity: 0.4 }}>Last »</span>
          )}
        </div>
      )}
    </main>
  );
}
