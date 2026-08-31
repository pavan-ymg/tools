import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { FORM_REGISTRY } from "@/lib/forms/registry";
import ExportButton from "./ExportButton";
import BackLink from "@/app/(dashboard)/BackLink";

export default async function ExportPage() {
  const session = await auth();
  const userId = Number(session!.user.id);

  if (!(await can(userId, "intake.export"))) {
    return (
      <main style={{ padding: 32 }}>
        <p style={{ color: "var(--text-secondary)" }}>You don&apos;t have permission to export intake records.</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 32, maxWidth: 640 }}>
      <BackLink href="/intake" label="Back to Intake Records" />
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Export</h1>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 24 }}>
        Downloads call-intake records as a CSV file, one client&apos;s form at a time — data stays in this tool rather than pushing to the CRM.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {FORM_REGISTRY.map((form) => (
          <div
            key={form.formType}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "14px 16px",
              border: "1px solid var(--glass-border)",
              borderRadius: 8,
            }}
          >
            <div>
              <div style={{ fontWeight: 500, fontSize: 14 }}>{form.clientName}</div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{form.caseType}</div>
            </div>
            <ExportButton formType={form.formType} fileSlug={form.formType} />
          </div>
        ))}
      </div>
    </main>
  );
}
