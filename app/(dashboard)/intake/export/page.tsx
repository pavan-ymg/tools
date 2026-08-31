import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import ExportButton from "./ExportButton";

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
    <main style={{ padding: 32 }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>Export</h1>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 24 }}>
        Downloads every call-intake record as a CSV file, since data stays in this tool rather than pushing to the CRM.
      </p>
      <ExportButton />
    </main>
  );
}
