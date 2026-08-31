import Link from "next/link";
import { inArray, eq, and, or, ilike, lte, isNotNull, sql, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { intakeRecords, users } from "@/db/schema";
import { getScope, subordinateIds, can } from "@/lib/permissions";
import { FORM_REGISTRY } from "@/lib/forms/registry";
import type { BeverlyLawAnswers } from "@/lib/forms/beverly-law";

const STAGE_LABELS: Record<string, string> = {
  new: "New",
  attempted: "Attempted",
  contacted: "Contacted",
  qualified: "Qualified",
  sent_to_lp: "Sent to LP",
  confirmed: "Confirmed",
  rejected: "Rejected",
  dead: "Dead",
};

export default async function IntakeListPage({
  searchParams,
}: {
  searchParams: Promise<{ form?: string; q?: string; stage?: string; due?: string }>;
}) {
  const session = await auth();
  const userId = Number(session!.user.id);

  const scope = await getScope(userId, "intake.view");
  if (!scope) {
    return (
      <main style={{ padding: 32 }}>
        <p style={{ color: "var(--text-secondary)" }}>
          You don&apos;t have permission to view call intake.
        </p>
      </main>
    );
  }

  const { form: formType, q, stage: stageFilter, due } = await searchParams;
  const query = q?.trim();
  const dueOnly = due === "1";

  // No campaign picked yet — each client's form has its own answer
  // shape (§6.6), so a blended list across campaigns doesn't mean
  // anything. Pick one first, same pattern as /intake/new.
  if (!formType) {
    return (
      <main style={{ padding: 32, maxWidth: 640 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Intake Records</h1>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 24 }}>
          Choose which client&apos;s records to view.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {FORM_REGISTRY.map((form) => (
            <Link
              key={form.formType}
              href={`/intake?form=${form.formType}`}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "14px 16px",
                border: "1px solid var(--glass-border)",
                borderRadius: 8,
                textDecoration: "none",
                color: "var(--text-primary)",
              }}
            >
              <span style={{ fontWeight: 500, fontSize: 14 }}>{form.clientName}</span>
              <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{form.caseType}</span>
            </Link>
          ))}
        </div>
      </main>
    );
  }

  const currentForm = FORM_REGISTRY.find((f) => f.formType === formType);

  let listQuery = db
    .select({
      id: intakeRecords.id,
      phone: intakeRecords.phone,
      email: intakeRecords.email,
      stage: intakeRecords.stage,
      answers: intakeRecords.answers,
      scoredByTl: intakeRecords.scoredByTl,
      followUpAt: intakeRecords.followUpAt,
      createdAt: intakeRecords.createdAt,
      ownerName: users.name,
    })
    .from(intakeRecords)
    .innerJoin(users, eq(intakeRecords.ownerId, users.id))
    .$dynamic();

  const scopeFilter =
    scope === "own"
      ? eq(intakeRecords.ownerId, userId)
      : scope === "team"
        ? inArray(intakeRecords.ownerId, [userId, ...(await subordinateIds(userId))])
        : undefined; // scope === "all" -> no owner filter

  const searchFilter = query
    ? or(
        ilike(intakeRecords.phone, `%${query}%`),
        ilike(intakeRecords.email, `%${query}%`),
        sql`${intakeRecords.answers}->>'fullName' ILIKE ${`%${query}%`}`
      )
    : undefined;

  const filters = [
    eq(intakeRecords.formType, formType),
    scopeFilter,
    searchFilter,
    stageFilter ? eq(intakeRecords.stage, stageFilter as (typeof intakeRecords.stage.enumValues)[number]) : undefined,
    dueOnly ? and(isNotNull(intakeRecords.followUpAt), lte(intakeRecords.followUpAt, new Date())) : undefined,
  ].filter((f): f is NonNullable<typeof f> => f !== undefined);

  listQuery = listQuery.where(and(...filters));

  const rows = await listQuery.orderBy(desc(intakeRecords.createdAt)).limit(100);

  return (
    <main style={{ padding: 32 }}>
      <div style={{ marginBottom: 4 }}>
        <Link href="/intake" style={{ fontSize: 13, color: "var(--accent)" }}>
          ← All campaigns
        </Link>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>
          Intake Records — {currentForm?.clientName ?? formType}
        </h1>
        <div style={{ display: "flex", gap: 12 }}>
          {(await can(userId, "intake.export")) && (
            <Link
              href="/intake/export"
              style={{
                border: "1px solid var(--glass-border)",
                color: "var(--text-secondary)",
                padding: "8px 16px",
                borderRadius: 6,
                fontSize: 13,
                textDecoration: "none",
              }}
            >
              Export
            </Link>
          )}
          {currentForm && (
            <Link
              href={currentForm.href}
              style={{
                background: "var(--accent)",
                color: "white",
                padding: "8px 16px",
                borderRadius: 6,
                fontSize: 13,
                textDecoration: "none",
              }}
            >
              + New intake
            </Link>
          )}
        </div>
      </div>

      <form method="GET" style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <input type="hidden" name="form" value={formType} />
        <input
          name="q"
          type="text"
          defaultValue={query ?? ""}
          placeholder="Search name, phone, or email…"
          style={{
            padding: "8px 12px",
            borderRadius: 6,
            border: "1px solid var(--glass-border)",
            background: "rgba(0,0,0,0.2)",
            color: "var(--text-primary)",
            width: 280,
            maxWidth: "100%",
          }}
        />
        <select
          name="stage"
          defaultValue={stageFilter ?? ""}
          style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid var(--glass-border)", background: "rgba(0,0,0,0.2)", color: "var(--text-primary)" }}
        >
          <option value="">All stages</option>
          {Object.entries(STAGE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
          <input type="checkbox" name="due" value="1" defaultChecked={dueOnly} style={{ width: 16, height: 16 }} />
          Due for follow-up
        </label>
        <button
          type="submit"
          style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid var(--glass-border)", background: "transparent", color: "var(--accent)", fontSize: 13, cursor: "pointer" }}
        >
          Filter
        </button>
        {(query || stageFilter || dueOnly) && (
          <a href={`/intake?form=${formType}`} style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            Clear
          </a>
        )}
      </form>

      <div style={{ overflowX: "auto", border: "1px solid var(--glass-border)", borderRadius: 8 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "rgba(255,255,255,0.03)" }}>
              {["Name", "Phone", "Stage", "Owner", "Scored", "Follow-up", "Created"].map((h) => (
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
            {rows.map((row) => {
              const answers = row.answers as BeverlyLawAnswers;
              return (
                <tr key={row.id}>
                  <td style={{ padding: "10px 14px", fontSize: 13, borderBottom: "1px solid var(--glass-border)" }}>
                    <Link href={`/intake/${row.id}`} style={{ color: "var(--accent)" }}>
                      {answers.fullName || "(no name)"}
                    </Link>
                  </td>
                  <td style={{ padding: "10px 14px", fontSize: 13, borderBottom: "1px solid var(--glass-border)" }}>{row.phone}</td>
                  <td style={{ padding: "10px 14px", fontSize: 13, borderBottom: "1px solid var(--glass-border)" }}>{STAGE_LABELS[row.stage]}</td>
                  <td style={{ padding: "10px 14px", fontSize: 13, borderBottom: "1px solid var(--glass-border)" }}>{row.ownerName}</td>
                  <td style={{ padding: "10px 14px", fontSize: 13, borderBottom: "1px solid var(--glass-border)" }}>{row.scoredByTl ? "✓" : "—"}</td>
                  <td style={{ padding: "10px 14px", fontSize: 13, borderBottom: "1px solid var(--glass-border)" }}>
                    {row.followUpAt
                      ? (
                        <span style={{ color: row.followUpAt <= new Date() ? "var(--danger)" : "var(--text-primary)" }}>
                          {row.followUpAt.toLocaleDateString()}
                        </span>
                      )
                      : "—"}
                  </td>
                  <td style={{ padding: "10px 14px", fontSize: 13, borderBottom: "1px solid var(--glass-border)" }}>
                    {row.createdAt.toLocaleDateString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p style={{ padding: 24, color: "var(--text-secondary)", fontSize: 13 }}>No intake records yet.</p>
        )}
      </div>
    </main>
  );
}
