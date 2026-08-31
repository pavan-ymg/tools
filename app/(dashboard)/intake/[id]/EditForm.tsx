"use client";

import { useActionState } from "react";
import IntakeFormFields from "../IntakeFormFields";
import type { BeverlyLawAnswers } from "@/lib/forms/beverly-law";

type UpdateAction = (prevState: string | undefined, formData: FormData) => Promise<string | undefined>;

export default function EditForm({
  answers,
  action,
}: {
  answers: BeverlyLawAnswers;
  action: UpdateAction;
}) {
  const [error, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <IntakeFormFields defaultValues={answers} />

      {error && <p style={{ color: "var(--danger)", fontSize: 13 }}>{error}</p>}

      <button
        type="submit"
        disabled={pending}
        style={{
          padding: "10px 0",
          borderRadius: 6,
          border: "none",
          background: "var(--accent)",
          color: "white",
          fontWeight: 500,
          cursor: pending ? "default" : "pointer",
          opacity: pending ? 0.7 : 1,
        }}
      >
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
