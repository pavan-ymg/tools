import Link from "next/link";
import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { auditLog, auditActionEnum } from "@/db/schema";
import { isSuperAdmin } from "../users/actions";
import BackLink from "@/app/(dashboard)/BackLink";
import { formatDateTime } from "@/lib/format-date";

const ACTION_LABELS: Record<string, string> = {
  login: "Logged in",
  logout: "Logged out",
  user_invited: "Invited user",
  user_updated: "Updated user",
  user_deactivated: "Deactivated user",
  user_reactivated: "Reactivated user",
  user_deleted: "Deleted user",
  user_force_reset: "Force-reset user's password",
  role_created: "Created role",
  role_permissions_updated: "Updated role permissions",
  role_deleted: "Deleted role",
  user_permissions_overridden: "Edited user's individual permissions",
};

type AuditAction = (typeof auditActionEnum.enumValues)[number];
const PAGE_SIZE = 50;

const inputStyle = {
  padding: "8px 12px",
  borderRadius: 6,
  border: "1px solid var(--glass-border)",
  background: "rgba(0,0,0,0.2)",
  color: "var(--text-primary)",
  fontSize: 13,
} as const;

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; action?: string }>;
}) {
  const { page: pageParam, q, action: actionParam } = await searchParams;
  const query = q?.trim();
  const action = (auditActionEnum.enumValues as readonly string[]).includes(actionParam ?? "")
    ? (actionParam as AuditAction)
    : undefined;
  const session = await auth();
  const userId = Number(session!.user.id);

  // Hardcoded to super_admin only, not the roles.manage permission
  // (Pavan, 2026-09-01: "only super admin can see the activity of all
  // things... not even manager") — a Manager can hold roles.manage for
  // day-to-day role/permission work without also seeing this, since the
  // log itself was built after a Manager's own action on the super_admin
  // account went unrecorded (§5.16).
  if (!(await isSuperAdmin(userId))) {
    return (
      <main style={{ padding: 32 }}>
        <p style={{ color: "var(--text-secondary)" }}>You don&apos;t have permission to view the audit log.</p>
      </main>
    );
  }

  // Not under the Lead Feed's 100-contact cap — this is super_admin-only
  // and holds staff/admin actions, never lead contact data.
  const filters: SQL[] = [];
  if (action) filters.push(eq(auditLog.action, action));
  if (query) filters.push(or(ilike(auditLog.actorLabel, `%${query}%`), ilike(auditLog.targetLabel, `%${query}%`))!);
  const where = filters.length > 0 ? and(...filters) : undefined;

  const [{ count: totalCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(auditLog)
    .where(where);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const page = Math.min(Math.max(1, Number(pageParam) || 1), totalPages);

  const entries = await db
    .select()
    .from(auditLog)
    .where(where)
    .orderBy(desc(auditLog.createdAt))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  const pageUrl = (targetPage: number) =>
    `/admin/audit?page=${targetPage}${action ? `&action=${action}` : ""}${query ? `&q=${encodeURIComponent(query)}` : ""}`;

  return (
    <main style={{ padding: 32 }}>
      <BackLink href="/admin/users" label="Back to Users" />
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Audit Log</h1>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 24 }}>
        Every user and role management action, most recent first. Survives the deletion of either account involved.
      </p>

      <form method="GET" style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <input
          name="q"
          type="text"
          defaultValue={query ?? ""}
          placeholder="Search who or target…"
          style={{ ...inputStyle, width: 280, maxWidth: "100%" }}
        />
        <select name="action" defaultValue={action ?? ""} style={inputStyle}>
          <option value="">All actions</option>
          {auditActionEnum.enumValues.map((a) => (
            <option key={a} value={a}>
              {ACTION_LABELS[a] ?? a}
            </option>
          ))}
        </select>
        <button
          type="submit"
          style={{ ...inputStyle, background: "transparent", color: "var(--accent)", cursor: "pointer", padding: "8px 16px" }}
        >
          Filter
        </button>
        {(query || action) && (
          <a href="/admin/audit" className="text-link" style={{ display: "flex", alignItems: "center", color: "var(--text-secondary)", fontSize: 13 }}>
            Clear
          </a>
        )}
        <span style={{ marginLeft: "auto", alignSelf: "center", fontSize: 13, color: "var(--text-secondary)" }}>
          {totalCount === 0 ? "No entries" : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, totalCount)} of ${totalCount}`}
        </span>
      </form>

      <div style={{ overflowX: "auto", border: "1px solid var(--glass-border)", borderRadius: 8 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "rgba(255,255,255,0.03)" }}>
              {["When (IST)", "Who", "Action", "Target", "Detail"].map((h) => (
                <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 13, color: "var(--text-secondary)", borderBottom: "1px solid var(--glass-border)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id}>
                <td style={{ padding: "10px 14px", fontSize: 13, borderBottom: "1px solid var(--glass-border)", whiteSpace: "nowrap" }}>
                  {formatDateTime(e.createdAt)}
                </td>
                <td style={{ padding: "10px 14px", fontSize: 13, borderBottom: "1px solid var(--glass-border)" }}>{e.actorLabel}</td>
                <td style={{ padding: "10px 14px", fontSize: 13, borderBottom: "1px solid var(--glass-border)" }}>
                  {ACTION_LABELS[e.action] ?? e.action}
                </td>
                <td style={{ padding: "10px 14px", fontSize: 13, borderBottom: "1px solid var(--glass-border)" }}>{e.targetLabel}</td>
                <td style={{ padding: "10px 14px", fontSize: 12, color: "var(--text-secondary)", borderBottom: "1px solid var(--glass-border)", maxWidth: 320 }}>
                  {e.detail ? JSON.stringify(e.detail) : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {entries.length === 0 && (
          <p style={{ padding: 24, color: "var(--text-secondary)", fontSize: 13 }}>
            {query || action ? "No entries match these filters." : "No admin actions logged yet."}
          </p>
        )}
      </div>

      {totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16 }}>
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
        </div>
      )}
    </main>
  );
}
