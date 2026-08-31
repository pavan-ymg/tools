"use client";

import { useActionState } from "react";
import { createIntakeAction } from "../../actions";
import IntakeFormFields from "../../IntakeFormFields";
import BackLink from "@/app/(dashboard)/BackLink";

export default function NewBeverlyLawIntakePage() {
  const [error, formAction, pending] = useActionState(createIntakeAction, undefined);

  return (
    <main style={{ padding: 32, maxWidth: 720 }}>
      <BackLink href="/intake?form=beverly_law" label="View Beverly Law records" />
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24 }}>New Intake — Beverly Law</h1>

      <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        <IntakeFormFields />

        {error && <p style={{ color: "var(--danger)", fontSize: 13 }}>{error}</p>}

        <button
          type="submit"
          disabled={pending}
          style={{
            padding: "10px 0",
            borderRadius: 6,
            border: "none",
            background: "var(--accent)",
            color: "var(--accent-text)",
            fontWeight: 500,
            cursor: pending ? "default" : "pointer",
            opacity: pending ? 0.7 : 1,
          }}
        >
          {pending ? "Saving…" : "Save intake record"}
        </button>
      </form>
    </main>
  );
}
