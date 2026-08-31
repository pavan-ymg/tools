import Link from "next/link";
import { FORM_REGISTRY } from "@/lib/forms/registry";

export default function NewIntakePickerPage() {
  return (
    <main style={{ padding: 32, maxWidth: 640 }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>New Intake</h1>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 8 }}>
        Choose which client this call is for.
      </p>
      <p style={{ marginBottom: 24 }}>
        <Link href="/intake" style={{ fontSize: 13, color: "var(--accent)" }}>
          View existing intake records →
        </Link>
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {FORM_REGISTRY.map((form) => (
          <Link
            key={form.formType}
            href={form.href}
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
