import Link from "next/link";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { FORM_REGISTRY } from "@/lib/forms/registry";

export default async function NewIntakePickerPage() {
  const session = await auth();
  const userId = Number(session!.user.id);

  if (!(await can(userId, "intake.create"))) {
    return (
      <main style={{ padding: 32 }}>
        <p style={{ color: "var(--text-secondary)" }}>You don&apos;t have permission to log a new intake call.</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 32, maxWidth: 640 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>New Intake</h1>
        <Link
          href="/intake"
          className="cta-secondary"
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "var(--accent)",
            border: "1px solid var(--glass-border)",
            borderRadius: 6,
            padding: "8px 14px",
            textDecoration: "none",
            whiteSpace: "nowrap",
          }}
        >
          View intake records →
        </Link>
      </div>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 24 }}>
        Choose which client this call is for.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {FORM_REGISTRY.map((form) => (
          <Link
            key={form.formType}
            href={form.href}
            className="card-link"
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
