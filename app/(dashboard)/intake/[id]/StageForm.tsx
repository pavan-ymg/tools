"use client";

import { useActionState, useState } from "react";

type StageAction = (prevState: string | undefined, formData: FormData) => Promise<string | undefined>;

const STAGES = ["new", "attempted", "contacted", "qualified", "sent_to_lp", "confirmed", "rejected", "dead"] as const;
const STAGE_LABELS: Record<string, string> = {
  new: "New", attempted: "Attempted", contacted: "Contacted", qualified: "Qualified",
  sent_to_lp: "Sent to LP", confirmed: "Confirmed", rejected: "Rejected", dead: "Dead",
};

export default function StageForm({ currentStage, action }: { currentStage: string; action: StageAction }) {
  const [error, formAction, pending] = useActionState(action, undefined);
  const [stage, setStage] = useState(currentStage);

  return (
    <form
      action={formAction}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        border: "1px solid var(--glass-border)",
        borderRadius: 8,
        padding: 16,
      }}
    >
      <span style={{ fontSize: 14, fontWeight: 600 }}>Stage</span>
      <select
        name="stage"
        value={stage}
        onChange={(e) => setStage(e.target.value)}
        style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid var(--glass-border)", background: "rgba(0,0,0,0.2)", color: "var(--text-primary)" }}
      >
        {STAGES.map((s) => (
          <option key={s} value={s}>
            {STAGE_LABELS[s]}
          </option>
        ))}
      </select>

      {stage === "rejected" && (
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Rejection reason (required)</span>
          <input
            name="rejectionReason"
            type="text"
            style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid var(--glass-border)", background: "rgba(0,0,0,0.2)", color: "var(--text-primary)" }}
          />
        </label>
      )}

      {error && <p style={{ color: "var(--danger)", fontSize: 13 }}>{error}</p>}

      <button
        type="submit"
        disabled={pending}
        style={{ padding: "8px 0", borderRadius: 6, border: "none", background: "var(--accent)", color: "white", fontWeight: 500, cursor: pending ? "default" : "pointer" }}
      >
        {pending ? "Updating…" : "Update stage"}
      </button>
    </form>
  );
}
