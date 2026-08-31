import Link from "next/link";
import { inArray, eq, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { intakeRecords, users } from "@/db/schema";
import { getScope, subordinateIds, can } from "@/lib/permissions";
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

export default async function IntakeListPage() {
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

  let query = db
    .select({
      id: intakeRecords.id,
      phone: intakeRecords.phone,
      email: intakeRecords.email,
      stage: intakeRecords.stage,
      answers: intakeRecords.answers,
      scoredByTl: intakeRecords.scoredByTl,
      createdAt: intakeRecords.createdAt,
      ownerName: users.name,
    })
    .from(intakeRecords)
    .innerJoin(users, eq(intakeRecords.ownerId, users.id))
    .$dynamic();

  if (scope === "own") {
    query = query.where(eq(intakeRecords.ownerId, userId));
  } else if (scope === "team") {
    const ids = [userId, ...(await subordinateIds(userId))];
    query = query.where(inArray(intakeRecords.ownerId, ids));
  }
  // scope === "all" -> no filter at all

  const rows = await query.orderBy(desc(intakeRecords.createdAt)).limit(100);

  return (
    <main style={{ padding: 32 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>Call Intake</h1>
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
          <Link
            href="/intake/new"
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
        </div>
      </div>

      <div style={{ overflowX: "auto", border: "1px solid var(--glass-border)", borderRadius: 8 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "rgba(255,255,255,0.03)" }}>
              {["Name", "Phone", "Stage", "Owner", "Scored", "Created"].map((h) => (
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
